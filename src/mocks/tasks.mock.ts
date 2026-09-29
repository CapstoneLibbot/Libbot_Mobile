import { TaskItem } from '../features/tasks/types/task.types';

export const tasksMock: TaskItem[] = [
  {
    id: 'task-001',
    title: 'Shelf inventory scan',
    description: 'Verify missing items around level 2.',
    status: 'ASSIGNED',
    priority: 'High',
    assignedRobotId: 'R-01',
    createdAt: '2026-09-29T08:00:00Z',
  },
  {
    id: 'task-002',
    title: 'Misplaced books review',
    description: 'Check flagged titles in the reading hall.',
    status: 'IN_PROGRESS',
    priority: 'Medium',
    assignedRobotId: 'R-02',
    createdAt: '2026-09-29T07:10:00Z',
  },
];
