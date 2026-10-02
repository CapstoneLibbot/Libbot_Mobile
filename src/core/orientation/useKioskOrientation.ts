import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect } from "react";

/**
 * Route-level orientation policy for kiosk mode.
 * Requests landscape while active in (kiosk) layout, unlocks on unmount.
 */
export function useKioskOrientation(): void {
  useEffect(() => {
    let isMounted = true;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      (err: unknown) => {
        if (isMounted) {
          console.warn("Screen orientation lockAsync failed:", err);
        }
      },
    );

    return () => {
      isMounted = false;
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);
}
