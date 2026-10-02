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
    config: {
      googleMaps: {
        apiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
          process.env.GOOGLE_MAPS_API_KEY ||
          "AIzaSyLibotDevelopmentKeyPlaceholder000",
      },
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "8df84231-056b-44da-84da-dc44e6f88ff6",
    },
  },
};

export default config;
