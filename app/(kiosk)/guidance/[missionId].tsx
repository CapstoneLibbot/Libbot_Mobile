import { router } from "expo-router";
import React, { useEffect } from "react";
import { AppLoading } from "@/shared/ui";

export default function GuidanceRoute(): React.ReactElement {
  useEffect(() => { router.replace("/(kiosk)/search"); }, []);
  return <AppLoading message="Đang mở bản đồ dẫn đường…" />;
}
