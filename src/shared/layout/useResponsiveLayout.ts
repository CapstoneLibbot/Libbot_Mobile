import { useWindowDimensions } from "react-native";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getResponsiveBreakpoint,
  ResponsiveBreakpoint,
} from "./responsive";

export interface ResponsiveLayout extends ResponsiveBreakpoint {
  width: number;
  height: number;
  insets: EdgeInsets;
}

const DEFAULT_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  let insets = DEFAULT_INSETS;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    insets = useSafeAreaInsets();
  } catch {
    insets = DEFAULT_INSETS;
  }

  const breakpoint = getResponsiveBreakpoint(width, height);

  return {
    width,
    height,
    insets,
    ...breakpoint,
  };
}
