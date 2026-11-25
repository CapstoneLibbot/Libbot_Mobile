import { describe, expect, it } from "vitest";
import { getFriendlyErrorMessage, toApiError } from "../apiError";

describe("API Error normalization (src/services/api/apiError.ts)", () => {
  it("maps ASP.NET Core Problem Details status, message (detail), and traceId correctly", () => {
    const problemDetailsPayload = {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      title: "Bad Request",
      status: 400,
      detail: "matchMode must be FUZZY or EXACT.",
      traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
    };

    const axiosLikeError = {
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: problemDetailsPayload,
      },
    };

    const apiError = toApiError(axiosLikeError);

    expect(apiError.status).toBe(400);
    expect(apiError.message).toBe("matchMode must be FUZZY or EXACT.");
    expect(apiError.traceId).toBe(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
    );
    expect(apiError.friendlyMessage).toBe(
      "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.",
    );
  });

  it("falls back to problem title when detail is missing", () => {
    const problemWithoutDetail = {
      title: "Book not found",
      status: 404,
      traceId: "trace-999",
    };

    const axiosLikeError = {
      isAxiosError: true,
      response: {
        status: 404,
        data: problemWithoutDetail,
      },
    };

    const apiError = toApiError(axiosLikeError);
    expect(apiError.status).toBe(404);
    expect(apiError.message).toBe("Book not found");
    expect(apiError.traceId).toBe("trace-999");
    expect(getFriendlyErrorMessage(apiError)).toBe(
      "Không tìm thấy dữ liệu yêu cầu.",
    );
  });

  it("handles string response body from ASP.NET Core (e.g. BadRequest string)", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: "page must be at least 1.",
      },
    };

    const apiError = toApiError(axiosLikeError);
    expect(apiError.status).toBe(400);
    expect(apiError.message).toBe("page must be at least 1.");
    expect(apiError.friendlyMessage).toBe(
      "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.",
    );
  });

  it("provides user-friendly Vietnamese fallback for 503 robot unavailable", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          title: "Robot is unavailable",
          detail: "Cannot connect to robot service.",
        },
      },
    };

    const apiError = toApiError(axiosLikeError);
    expect(apiError.status).toBe(503);
    expect(apiError.friendlyMessage).toBe(
      "Hệ thống robot hiện không khả dụng. Vui lòng thử lại sau.",
    );
    expect(getFriendlyErrorMessage(apiError)).toBe(
      "Hệ thống robot hiện không khả dụng. Vui lòng thử lại sau.",
    );
  });

  it("maps structured backend guidance error code and message to Vietnamese friendly copy", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: "WRONG_ACTIVE_MAP",
          message: "The selected destination is not on the robot's active map.",
        },
      },
    };

    const apiError = toApiError(axiosLikeError);
    expect(apiError.status).toBe(409);
    expect(apiError.code).toBe("WRONG_ACTIVE_MAP");
    expect(apiError.message).toBe(
      "The selected destination is not on the robot's active map.",
    );
    expect(getFriendlyErrorMessage(apiError)).toBe(
      "Điểm đến thuộc bản đồ khác với bản đồ robot đang chạy.",
    );
  });
});
