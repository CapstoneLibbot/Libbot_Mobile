export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  code?: string;
  errors?: Record<string, string[]>;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ApiErrorOptions {
  message: string;
  status?: number;
  code?: string;
  traceId?: string;
  details?: unknown;
  friendlyMessage?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly traceId?: string;
  readonly details?: unknown;
  readonly friendlyMessage: string;
  readonly isApiError = true;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.traceId = options.traceId;
    this.details = options.details;
    this.friendlyMessage =
      options.friendlyMessage || getFriendlyMessageByStatus(options.status);

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function getFriendlyMessageByStatus(status?: number): string {
  switch (status) {
    case 400:
      return "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.";
    case 401:
      return "Phiên làm việc hết hạn hoặc chưa được xác thực.";
    case 403:
      return "Bạn không có quyền thực hiện hành động này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 408:
      return "Kết nối quá thời gian chờ. Vui lòng thử lại.";
    case 409:
      return "Dữ liệu đang có xung đột. Vui lòng thử lại.";
    case 422:
      return "Dữ liệu không thể xử lý. Vui lòng kiểm tra lại.";
    case 500:
      return "Máy chủ gặp sự cố nội bộ. Vui lòng thử lại sau.";
    case 502:
    case 503:
    case 504:
      return "Hệ thống LiBot hiện không khả dụng. Vui lòng thử lại sau.";
    default:
      return "Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Handle Axios-like error object
  if (typeof error === "object" && error !== null && "isAxiosError" in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      code?: string;
      message?: string;
    };

    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    let message = "";
    let traceId: string | undefined;
    let code: string | undefined = axiosError.code;
    let details: unknown;

    if (typeof data === "object" && data !== null) {
      const problem = data as ProblemDetails;
      message = problem.detail || problem.title || "";
      traceId =
        problem.traceId ||
        (typeof problem.extensions?.traceId === "string"
          ? (problem.extensions.traceId as string)
          : undefined);
      code =
        problem.code ||
        (typeof problem.extensions?.code === "string"
          ? (problem.extensions.code as string)
          : undefined) ||
        problem.type ||
        code;
      details = problem.errors || problem;
    } else if (typeof data === "string" && data.trim()) {
      message = data.trim();
    }

    if (!message) {
      message = axiosError.message || getFriendlyMessageByStatus(status);
    }

    const friendlyMessage = getFriendlyMessageByStatus(status);

    return new ApiError({
      message,
      status,
      code,
      traceId,
      details,
      friendlyMessage,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      friendlyMessage: "Đã xảy ra lỗi. Vui lòng thử lại.",
      cause: error,
    });
  }

  return new ApiError({
    message: String(error || "Unknown API error"),
    friendlyMessage: "Đã xảy ra lỗi không xác định.",
  });
}

export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.friendlyMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}
