export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown[];
}

export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { success: true, message, data };
}

export function errorResponse(message: string, errors?: unknown[]): ApiResponse<null> {
  return { success: false, message, data: null, errors };
}
