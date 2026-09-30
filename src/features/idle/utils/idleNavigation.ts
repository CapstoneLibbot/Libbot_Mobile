export interface StartNavigationOptions {
  onAnimate?: (callback: () => void) => void;
  onNavigate: () => void;
  recordInteraction: () => void;
  resetKioskSession: () => void;
}

/**
 * Creates a guarded handler for starting the kiosk experience.
 * Guarantees that multiple consecutive taps or rapid clicks only trigger
 * the navigation workflow and session reset once.
 */
export function createStartNavigationHandler({
  onAnimate,
  onNavigate,
  recordInteraction,
  resetKioskSession,
}: StartNavigationOptions): () => boolean {
  let isNavigating = false;

  return function handleStart(): boolean {
    if (isNavigating) {
      return false;
    }
    isNavigating = true;

    const performNavigation = () => {
      resetKioskSession();
      recordInteraction();
      onNavigate();
    };

    if (onAnimate) {
      onAnimate(performNavigation);
    } else {
      performNavigation();
    }

    return true;
  };
}
