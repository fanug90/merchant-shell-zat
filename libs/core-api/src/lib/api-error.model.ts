export interface ApiError {
  correlationId: string;
  status: number;
  errorCode: string;
  message: string;
  details?: Record<string, string>;
}
