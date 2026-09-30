import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "LiBot Mobile",
  slug: "libot-mobile",
  scheme: "libotmobile",
  version: "1.0.0",
  orientation: "landscape",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  plugins: [
    "expo-router",
    ["expo-system-ui", { userInterfaceStyle: "light" }],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#E6F4FE",
      },
    ],
    "expo-font",
    "expo-secure-store",
    ["expo-screen-orientation", { initialOrientation: "LANDSCAPE" }],
  ],
  ios: {
    bundleIdentifier: "com.yourorg.libot",
    supportsTablet: true,
    requireFullScreen: true,
  },
  android: {
    package: "com.yourorg.libot",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
