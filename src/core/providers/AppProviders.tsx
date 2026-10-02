import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "./QueryProvider";

void SplashScreen.preventAutoHideAsync();

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({
  children,
}: AppProvidersProps): React.ReactElement {
  const [fontsLoaded, fontError] = useFonts({
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    InterExtraBold: Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return <></>;
  }

  return (
    <SafeAreaProvider>
      <QueryProvider>{children}</QueryProvider>
    </SafeAreaProvider>
  );
}
