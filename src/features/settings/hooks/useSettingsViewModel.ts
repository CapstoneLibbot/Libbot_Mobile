import { useCallback, useEffect, useState } from "react";
import { connectionTestService } from "../services/connectionTestService";
import { useSettingsStore } from "../state/useSettingsStore";
import {
  AppSettings,
  appSettingsSchema,
  ConnectionTestResult,
  FieldTestState,
} from "../types/settings.types";

export type TestableField = "apiBaseUrl" | "signalRUrl" | "xiaozhiWsUrl";

export interface SettingsFormValues {
  apiBaseUrl: string;
  signalRUrl: string;
  xiaozhiWsUrl: string;
  voiceKioskId: string;
  kioskIdleSeconds: string;
  voiceModalInactivitySeconds: string;
  voiceResponseTimeoutSeconds: string;
  feedbackIdleSeconds: string;
}

export interface SettingsFormErrors {
  apiBaseUrl?: string;
  signalRUrl?: string;
  xiaozhiWsUrl?: string;
  voiceKioskId?: string;
  kioskIdleSeconds?: string;
  voiceModalInactivitySeconds?: string;
  voiceResponseTimeoutSeconds?: string;
  feedbackIdleSeconds?: string;
}

function toFormValues(settings: AppSettings): SettingsFormValues {
  return {
    apiBaseUrl: settings.apiBaseUrl,
    signalRUrl: settings.signalRUrl,
    xiaozhiWsUrl: settings.xiaozhiWsUrl,
    voiceKioskId: settings.voiceKioskId,
    kioskIdleSeconds: String(settings.kioskIdleSeconds ?? 60),
    voiceModalInactivitySeconds: String(settings.voiceModalInactivitySeconds ?? 60),
    voiceResponseTimeoutSeconds: String(settings.voiceResponseTimeoutSeconds ?? 30),
    feedbackIdleSeconds: String(settings.feedbackIdleSeconds ?? 45),
  };
}

const initialFieldTestStates: Record<TestableField, FieldTestState> = {
  apiBaseUrl: { status: "idle" },
  signalRUrl: { status: "idle" },
  xiaozhiWsUrl: { status: "idle" },
};

export function useSettingsViewModel() {
  const storeSettings = useSettingsStore((s) => s.settings);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  const [formValues, setFormValues] = useState<SettingsFormValues>(() =>
    toFormValues(storeSettings),
  );
  const [errors, setErrors] = useState<SettingsFormErrors>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [fieldTestStates, setFieldTestStates] =
    useState<Record<TestableField, FieldTestState>>(initialFieldTestStates);

  // Lắng nghe thay đổi từ external Zustand store khi load hoặc reset
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((state) => {
      setFormValues(toFormValues(state.settings));
    });
    return unsub;
  }, []);

  const handleChange = useCallback((field: keyof SettingsFormValues, value: string) => {
    setSaveSuccess(false);
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field in initialFieldTestStates) {
      setFieldTestStates((prev) => ({
        ...prev,
        [field as TestableField]: { status: "idle" },
      }));
    }
  }, []);

  /**
   * Kiểm tra kết nối độc lập cho từng trường cấu hình (REST API, SignalR, Xiaozhi WS)
   */
  const handleTestField = useCallback(
    async (field: TestableField) => {
      setFieldTestStates((prev) => ({
        ...prev,
        [field]: {
          status: "testing",
          message: "Đang kiểm tra kết nối...",
        },
      }));

      let result: ConnectionTestResult;
      if (field === "apiBaseUrl") {
        result = await connectionTestService.testApiConnection(formValues.apiBaseUrl);
      } else if (field === "signalRUrl") {
        result = await connectionTestService.testSignalRConnection(formValues.signalRUrl);
      } else {
        result = await connectionTestService.testWebSocketConnection(formValues.xiaozhiWsUrl);
      }

      setFieldTestStates((prev) => ({
        ...prev,
        [field]: {
          status: result.success ? "success" : "error",
          message: result.message,
          latencyMs: result.latencyMs,
          testedAt: result.testedAt,
        },
      }));
    },
    [formValues.apiBaseUrl, formValues.signalRUrl, formValues.xiaozhiWsUrl],
  );

  const handleTestConnection = useCallback(async () => {
    setTestResult({
      isTesting: true,
      success: null,
      message: "Đang kiểm tra kết nối tới máy chủ...",
    });

    const result = await connectionTestService.testApiConnection(formValues.apiBaseUrl);
    setTestResult(result);
  }, [formValues.apiBaseUrl]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaveSuccess(false);
    setTestResult(null);

    const parsed = appSettingsSchema.safeParse(formValues);
    if (!parsed.success) {
      const fieldErrors: SettingsFormErrors = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0] as keyof SettingsFormErrors;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    const success = await updateSettings(parsed.data);
    if (success) {
      setSaveSuccess(true);
    }
    return success;
  }, [formValues, updateSettings]);

  const handleReset = useCallback(async () => {
    setErrors({});
    setSaveSuccess(false);
    setTestResult(null);
    setFieldTestStates(initialFieldTestStates);
    await resetToDefaults();
  }, [resetToDefaults]);

  return {
    formValues,
    errors,
    isLoading,
    saveSuccess,
    testResult,
    fieldTestStates,
    handleChange,
    handleTestField,
    handleTestConnection,
    handleSave,
    handleReset,
  };
}
