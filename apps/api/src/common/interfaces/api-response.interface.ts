export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}
