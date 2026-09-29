export interface MisplacedBook {
  id: string;
  title: string;
  shelf: string;
  status: 'FOUND' | 'FLAGGED' | 'REVIEW';
  lastSeen: string;
}
