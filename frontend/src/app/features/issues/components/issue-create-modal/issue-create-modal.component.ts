import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ActionsSubject, Store } from '@ngrx/store';
import { ofType } from '@ngrx/effects';

import { Observable, Subject } from 'rxjs';
import { skip, takeUntil } from 'rxjs/operators';

import { NzModalRef } from 'ng-zorro-antd/modal';

import { AppState } from '@core/interfaces/app.state';
import { getAssignedUsers, getCurrentProjectId } from '@features/project/state/project.selectors';
import { User } from '@core/interfaces/user';
import { getCurrentUser } from '@features/user/state/user.selectors';
import { Issue, IssuePriority, IssueStatus } from '@core/interfaces/issue';
import { DateUtil } from '@core/utils/date';
import { IssueApiActions, IssuePageActions } from '@features/issues/state/actions';
import { IssueUtil } from '@core/utils/issue';
import { QuillEditorUtil } from '@core/utils/quill';


@Component({
  selector: 'app-issue-create-modal',
  templateUrl: './issue-create-modal.component.html',
  styleUrls: ['./issue-create-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueCreateModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject();
  issueForm: FormGroup;

  users$: Observable<User[]>;
  currentProjectId: string;
  currentUser: User;

  defaultEditorOptions = QuillEditorUtil.getDefaultModuleOptions();
  isLoading: boolean;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private modalRef: NzModalRef,
    private actionSubject: ActionsSubject,
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.initForm();

    this.actionSubject.pipe(
      skip(1),
      ofType(
        IssueApiActions.createIssueSuccess,
        IssueApiActions.createIssueFailure,
      ),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.isLoading = false;
      this.closeModal();
    })
  }

  submitForm() {
    if (this.issueForm.invalid) {
      return;
    }
    this.isLoading = true;

    const now = DateUtil.getNow();
    const issueId = IssueUtil.getRandomId();
    const issue: Issue = {
      ...this.issueForm.getRawValue(),
      id: issueId,
      listPosition: 0,
      status: IssueStatus.BACKLOG,
      createdAt: now,
      updatedAt: now,
      comments: []
    }

    this.store.dispatch(IssuePageActions.createIssue({ issue }));
  }

  private loadData(): void {
    this.users$ = this.store.select(getAssignedUsers);

    this.store.select(getCurrentProjectId).pipe(takeUntil(this.destroy$))
      .subscribe(projectId => this.currentProjectId = projectId);

    this.store.select(getCurrentUser).pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

  }

  private initForm(): void {
    this.issueForm = this.fb.group({
      projectId: [this.currentProjectId],
      type: ['Story', Validators.required],
      priority: [IssuePriority.MEDIUM, Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: [''],
      reporter: [this.currentUser, Validators.required],
      assignees: [[]]
    });
  }

  closeModal(): void {
    this.modalRef.destroy();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
