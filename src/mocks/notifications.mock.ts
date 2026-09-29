import { NotificationItem } from '../features/notifications/types/notification.types';

export const notificationsMock: NotificationItem[] = [
  {
    id: 'n-001',
    title: 'Robot assigned',
    message: 'LiBot-01 is heading to your requested shelf.',
    type: 'INFO',
    timestamp: '2026-09-29T09:20:00Z',
    read: false,
  },
  {
    id: 'n-002',
    title: 'Mission complete',
    message: 'Your guidance session has concluded successfully.',
    type: 'SUCCESS',
    timestamp: '2026-09-29T09:00:00Z',
    read: true,
  },
];
