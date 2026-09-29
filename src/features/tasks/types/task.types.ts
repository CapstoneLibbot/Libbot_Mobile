export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ALERT';
  priority: 'Low' | 'Medium' | 'High';
  assignedRobotId?: string;
  createdAt: string;
}
