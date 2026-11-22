import { router } from "expo-router";
import React from "react";
import { SettingsScreen } from "@/features/settings";

export default function SettingsRoute(): React.ReactElement {
  return (
    <SettingsScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(kiosk)/idle");
        }
      }}
    />
  );
}
