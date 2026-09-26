import { Component, OnInit, computed, inject } from '@angular/core';
import { UserGreetingService } from '../../../core/services/user-greeting.service';
import { TaskService } from '../../../core/services/task.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-summary',
  imports: [RouterLink],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary implements OnInit {
  protected readonly greeting = inject(UserGreetingService);
  private readonly taskService = inject(TaskService);

  protected readonly todoCount = computed(
    () => this.taskService.tasks().filter((t) => t.status === 'todo').length,
  );
  protected readonly doneCount = computed(
    () => this.taskService.tasks().filter((t) => t.status === 'done').length,
  );
  protected readonly urgentCount = computed(
    () => this.taskService.tasks().filter((t) => t.priority === 'urgent').length,
  );
  protected readonly totalCount = computed(() => this.taskService.tasks().length);
  protected readonly inProgressCount = computed(
    () => this.taskService.tasks().filter((t) => t.status === 'inProgress').length,
  );
  protected readonly feedbackCount = computed(
    () => this.taskService.tasks().filter((t) => t.status === 'awaitFeedback').length,
  );

  protected readonly upcomingDeadline = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0);

    const nextDate = this.taskService
      .tasks()
      .filter((t) => t.status !== 'done')
      .map((t) => t.dueDate?.trim())
      .filter((d): d is string => Boolean(d))
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()) && d >= today)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return nextDate ? nextDate.toISOString().slice(0, 10) : null;
  });

  async ngOnInit(): Promise<void> {
    await this.taskService.list();
  }
}
