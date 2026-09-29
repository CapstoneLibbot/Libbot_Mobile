export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface MapLocation {
  lat: number;
  lng: number;
  label: string;
}
