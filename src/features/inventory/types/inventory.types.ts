export interface InventorySummary {
  id: string;
  totalItems: number;
  scanned: number;
  missing: number;
  status: 'OK' | 'REVIEW';
}
