import { router } from "expo-router";
import React from "react";
import { RobotMappingScreen } from "@/features/robot-mapping/screens/RobotMappingScreen";

export default function RobotMappingRoute(): React.ReactElement {
  return <RobotMappingScreen onBack={() => router.replace("/(kiosk)/idle")} />;
}
