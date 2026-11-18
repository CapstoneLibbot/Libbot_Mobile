import { describe, expect, it, vi } from "vitest";
import { useKioskStore } from "@/core/state";
import { getResponsiveBreakpoint } from "@/shared/layout/responsive";
import { IDLE_MENU_CONFIG } from "../constants/idleMenuConfig";
import {
  GLANCE_TARGETS,
  MAX_GAZE_OFFSET,
  ROBOT_EYE_DIMENSIONS,
} from "../constants/robotFaceConfig";
import { createStartNavigationHandler } from "../utils/idleNavigation";

describe("Idle Attract Navigation & Gaze Logic", () => {
  describe("createStartNavigationHandler", () => {
    it("executes session reset, interaction recording, and navigation on trigger", () => {
      const resetKioskSession = vi.fn();
      const recordInteraction = vi.fn();
      const onNavigate = vi.fn();

      const handleStart = createStartNavigationHandler({
        onNavigate,
        recordInteraction,
        resetKioskSession,
      });

      const triggered = handleStart();

      expect(triggered).toBe(true);
      expect(resetKioskSession).toHaveBeenCalledTimes(1);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it("guarantees idempotency: multiple consecutive taps only navigate once", () => {
      const resetKioskSession = vi.fn();
      const recordInteraction = vi.fn();
      const onNavigate = vi.fn();

      const handleStart = createStartNavigationHandler({
        onNavigate,
        recordInteraction,
        resetKioskSession,
      });

      const firstTap = handleStart();
      const secondTap = handleStart();
      const thirdTap = handleStart();
      const fourthTap = handleStart();

      expect(firstTap).toBe(true);
      expect(secondTap).toBe(false);
      expect(thirdTap).toBe(false);
      expect(fourthTap).toBe(false);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(resetKioskSession).toHaveBeenCalledTimes(1);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
    });

    it("waits for animation callback before executing navigation when onAnimate is supplied", () => {
      const resetKioskSession = vi.fn();
      const recordInteraction = vi.fn();
      const onNavigate = vi.fn();

      let finishAnimation: (() => void) | null = null;
      const onAnimate = vi.fn((done: () => void) => {
        finishAnimation = done;
      });

      const handleStart = createStartNavigationHandler({
        onAnimate,
        onNavigate,
        recordInteraction,
        resetKioskSession,
      });

      handleStart();

      expect(onAnimate).toHaveBeenCalledTimes(1);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(resetKioskSession).not.toHaveBeenCalled();

      expect(finishAnimation).toBeTypeOf("function");
      finishAnimation!();

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(resetKioskSession).toHaveBeenCalledTimes(1);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
    });
  });

  describe("LiBot Hamburger Speed Dial & Voice Modal Logic", () => {
    it("toggles hamburger menu open/closed state correctly and records interaction", () => {
      let isOpen = false;
      const recordInteraction = vi.fn();

      const toggleMenu = () => {
        recordInteraction();
        isOpen = !isOpen;
      };

      expect(isOpen).toBe(false);
      toggleMenu();
      expect(isOpen).toBe(true);
      expect(recordInteraction).toHaveBeenCalledTimes(1);

      toggleMenu();
      expect(isOpen).toBe(false);
      expect(recordInteraction).toHaveBeenCalledTimes(2);
    });

    it("closes menu when tapping outside (backdrop) and records interaction", () => {
      let isOpen = true;
      const recordInteraction = vi.fn();

      const closeMenu = () => {
        recordInteraction();
        isOpen = false;
      };

      closeMenu();
      expect(isOpen).toBe(false);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
    });

    it("ensures 'Tìm sách' action closes menu, records interaction, and triggers search navigation once", () => {
      let isNavigating = false;
      let isOpen = true;
      const onNavigate = vi.fn();
      const recordInteraction = vi.fn();
      const resetKioskSession = vi.fn();

      const handleSearchSelect = () => {
        if (isNavigating) return;
        isNavigating = true;
        isOpen = false;
        resetKioskSession();
        recordInteraction();
        onNavigate("/(kiosk)/search");
      };

      handleSearchSelect();
      handleSearchSelect(); // second rapid click

      expect(isOpen).toBe(false);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith("/(kiosk)/search");
      expect(resetKioskSession).toHaveBeenCalledTimes(1);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
    });

    it("ensures 'Tìm khu vực' action closes menu, records interaction, and navigates to facilities route once", () => {
      let isNavigating = false;
      let isOpen = true;
      const onNavigate = vi.fn();
      const recordInteraction = vi.fn();
      const resetKioskSession = vi.fn();

      const handleFacilitySelect = () => {
        if (isNavigating) return;
        isNavigating = true;
        isOpen = false;
        resetKioskSession();
        recordInteraction();
        onNavigate("/(kiosk)/facilities");
      };

      handleFacilitySelect();
      handleFacilitySelect(); // second rapid click

      expect(isOpen).toBe(false);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith("/(kiosk)/facilities");
      expect(resetKioskSession).toHaveBeenCalledTimes(1);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
    });

    it("handles Voice FAB: opens modal, sets isVoiceActive in kiosk store, and clears it on close", () => {
      const store = useKioskStore.getState();
      expect(store.isVoiceActive).toBe(false);

      let isModalOpen = false;
      const recordInteraction = vi.fn();

      const openVoiceModal = () => {
        recordInteraction();
        isModalOpen = true;
        store.setVoiceActive(true);
      };

      const closeVoiceModal = () => {
        recordInteraction();
        isModalOpen = false;
        store.setVoiceActive(false);
      };

      openVoiceModal();
      expect(isModalOpen).toBe(true);
      expect(useKioskStore.getState().isVoiceActive).toBe(true);
      expect(recordInteraction).toHaveBeenCalledTimes(1);

      closeVoiceModal();
      expect(isModalOpen).toBe(false);
      expect(useKioskStore.getState().isVoiceActive).toBe(false);
      expect(recordInteraction).toHaveBeenCalledTimes(2);
    });

    it("auto-closes voice modal after one minute of inactivity without navigating", () => {
      vi.useFakeTimers();

      const onClose = vi.fn();
      const onNavigate = vi.fn();

      const timer = setTimeout(() => {
        onClose();
      }, IDLE_MENU_CONFIG.voiceModalAutoCloseMs);

      expect(onClose).not.toHaveBeenCalled();

      // A short pause must never terminate a live follow-up conversation.
      vi.advanceTimersByTime(59_900);
      expect(onClose).not.toHaveBeenCalled();

      // Advance by remaining 100ms (one minute total)
      vi.advanceTimersByTime(100);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onNavigate).not.toHaveBeenCalled();

      clearTimeout(timer);
      vi.useRealTimers();
    });

    it("safely closes voice modal via close button (X) or backdrop overlay without navigating to search", () => {
      const onClose = vi.fn();
      const onNavigate = vi.fn();
      const setVoiceActive = vi.fn();
      const recordInteraction = vi.fn();

      const handleClose = () => {
        setVoiceActive(false);
        recordInteraction();
        onClose();
        // Crucial: no onNavigate call!
      };

      // User taps X close icon or backdrop overlay
      handleClose();

      expect(setVoiceActive).toHaveBeenCalledWith(false);
      expect(recordInteraction).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Responsive Breakpoints & Layout Utility", () => {
    it("identifies tablet landscape correctly (width >= 900 and height >= 520)", () => {
      const ipadStandard = getResponsiveBreakpoint(1024, 768);
      expect(ipadStandard.isTablet).toBe(true);
      expect(ipadStandard.isCompact).toBe(false);
      expect(ipadStandard.isNarrowHeight).toBe(false);
      expect(ipadStandard.columnsCount).toBe(2);

      const ipadAir = getResponsiveBreakpoint(1180, 820);
      expect(ipadAir.isTablet).toBe(true);
      expect(ipadAir.isCompact).toBe(false);
      expect(ipadAir.columnsCount).toBe(2);
    });

    it("identifies compact phone landscape with narrow height (e.g. iPhone)", () => {
      // iPhone 13/14/15/16 landscape
      const iphone = getResponsiveBreakpoint(844, 390);
      expect(iphone.isTablet).toBe(false);
      expect(iphone.isCompact).toBe(true);
      expect(iphone.isNarrowHeight).toBe(true);
      expect(iphone.columnsCount).toBe(1);

      // iPhone SE / 8 landscape
      const iphoneSE = getResponsiveBreakpoint(667, 375);
      expect(iphoneSE.isTablet).toBe(false);
      expect(iphoneSE.isCompact).toBe(true);
      expect(iphoneSE.isNarrowHeight).toBe(true);
      expect(iphoneSE.columnsCount).toBe(1);
    });

    it("identifies devices with narrow width as compact even if height is adequate", () => {
      const smallDevice = getResponsiveBreakpoint(768, 600);
      expect(smallDevice.isTablet).toBe(false);
      expect(smallDevice.isCompact).toBe(true);
      expect(smallDevice.isNarrowHeight).toBe(false);
      expect(smallDevice.columnsCount).toBe(1);
    });
  });

  describe("Robot Face Gaze & Bounds", () => {
    it("ensures all glance targets remain strictly within the maximum gaze offset bounds", () => {
      expect(GLANCE_TARGETS.length).toBeGreaterThan(0);

      for (const target of GLANCE_TARGETS) {
        expect(Math.abs(target.x)).toBeLessThanOrEqual(MAX_GAZE_OFFSET.x);
        expect(Math.abs(target.y)).toBeLessThanOrEqual(MAX_GAZE_OFFSET.y);
        expect(target.holdMs).toBeGreaterThanOrEqual(1000);
      }
    });

    it("verifies pupil dimensions and max gaze offset never breach socket clearance", () => {
      const { socketWidth, socketHeight, pupilWidth, pupilHeight } =
        ROBOT_EYE_DIMENSIONS;

      const maxHorizontalTravel = pupilWidth + 2 * MAX_GAZE_OFFSET.x;
      const maxVerticalTravel = pupilHeight + 2 * MAX_GAZE_OFFSET.y;

      expect(maxHorizontalTravel).toBeLessThanOrEqual(socketWidth);
      expect(maxVerticalTravel).toBeLessThanOrEqual(socketHeight);
    });
  });
});
