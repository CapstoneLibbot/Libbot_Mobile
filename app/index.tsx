import { Redirect } from "expo-router";
import React from "react";

export default function IndexRoute(): React.ReactElement {
  return <Redirect href="/(kiosk)/idle" />;
}
