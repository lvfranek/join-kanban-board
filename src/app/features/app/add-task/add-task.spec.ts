import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactService } from '../../../core/services/contact.service';
import { TaskService } from '../../../core/services/task.service';
import { AddTask } from './add-task';

describe('AddTask', () => {
  let component: AddTask;
  let fixture: ComponentFixture<AddTask>;
  let taskService: TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTask],
      providers: [
        {
          provide: ContactService,
          useValue: {
            list: async () => [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTask);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark required fields invalid after submitting an empty task', () => {
    component.createTask();

    expect(component.isFieldInvalid('title')).toBe(true);
    expect(component.isFieldInvalid('dueDate')).toBe(true);
    expect(component.isFieldInvalid('category')).toBe(true);
  });

  it('should mark required fields valid after they are filled', () => {
    component.updateField('title', 'Test task');
    component.updateField('dueDate', component.minDueDate);
    component.updateField('category', 'Technical Task');
    component.createTask();

    expect(component.isFieldValid('title')).toBe(true);
    expect(component.isFieldValid('dueDate')).toBe(true);
    expect(component.isFieldValid('category')).toBe(true);
  });

  it('should create a task with the provided initial status', () => {
    component.initialStatus = 'inProgress';
    component.updateField('title', 'Column task');
    component.updateField('dueDate', component.minDueDate);
    component.updateField('category', 'Technical Task');

    component.createTask();

    expect(taskService.tasks().at(-1)?.status).toBe('inProgress');
  });
});
