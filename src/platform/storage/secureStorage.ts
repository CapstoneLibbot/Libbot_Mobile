import * as SecureStore from "expo-secure-store";

const STORAGE_PREFIX = "libot_kiosk";

// In-memory cache dự phòng khi chạy trên Web hoặc môi trường không hỗ trợ Keystore
const memoryCache = new Map<string, string>();

/**
 * Tạo key hợp lệ cho Expo SecureStore:
 * Android Keystore SharedPreferences chỉ chấp nhận [a-zA-Z0-9._-], không chấp nhận dấu ':'.
 */
function buildStorageKey(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${STORAGE_PREFIX}_${sanitized}`;
}

function safeDeserialize<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

function safeSerialize<T>(value: T): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export const secureStorage = {
  async get<T>(key: string): Promise<T | null> {
    const storageKey = buildStorageKey(key);
    try {
      const raw = await SecureStore.getItemAsync(storageKey);
      return safeDeserialize<T>(raw ?? memoryCache.get(storageKey) ?? null);
    } catch {
      return safeDeserialize<T>(memoryCache.get(storageKey) ?? null);
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const storageKey = buildStorageKey(key);
    const serialized = safeSerialize(value);

    memoryCache.set(storageKey, serialized);

    try {
      await SecureStore.setItemAsync(storageKey, serialized);
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(
          `[secureStorage] Không thể ghi vào SecureStore cho key "${storageKey}":`,
          error,
        );
      }
    }
  },

  async remove(key: string): Promise<void> {
    const storageKey = buildStorageKey(key);
    memoryCache.delete(storageKey);

    try {
      await SecureStore.deleteItemAsync(storageKey);
    } catch {
      // Bỏ qua nếu key không tồn tại
    }
  },

  async clear(): Promise<void> {
    memoryCache.clear();
  },
};
