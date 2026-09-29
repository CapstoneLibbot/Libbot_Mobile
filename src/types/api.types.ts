export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}
