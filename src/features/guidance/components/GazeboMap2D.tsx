import React, { useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";
import type { GuidanceMapEndpoint, RobotPose } from "../types/guidance.types";
import { GAZEBO_MAP as map, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";

export interface GazeboMap2DProps {
  robot?: RobotPose | null;
  robotConnected?: boolean;
  runtimeLabel?: string;
  destination?: RobotPose | null;
  destinationLabel?: string;
  mapEndpoints?: GuidanceMapEndpoint[];
  selectedEndpointId?: string | null;
  path?: { x: number; y: number }[] | null;
  frameStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GazeboMap2D({
  robot,
  robotConnected = false,
  runtimeLabel,
  destination,
  destinationLabel,
  mapEndpoints = [],
  selectedEndpointId,
  path,
  frameStyle,
  testID = "gazebo-map-2d",
}: GazeboMap2DProps): React.ReactElement {
  const robotPixel = robot ? worldToGazeboPixel(robot) : null;
  const targetPixel = destination ? worldToGazeboPixel(destination) : null;
  const routePoints = useMemo(
    () => (path ?? []).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).map(worldToGazeboPixel),
    [path],
  );
  const routeString = routePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const endpointMarkers = useMemo(
    () => mapEndpoints
      .filter((endpoint) => endpoint.id !== selectedEndpointId)
      .map((endpoint) => ({ endpoint, pixel: worldToGazeboPixel(endpoint) }))
      .filter(({ pixel }) => (
        pixel.x >= 0 && pixel.x <= map.imageWidth
        && pixel.y >= 0 && pixel.y <= map.imageHeight
      )),
    [mapEndpoints, selectedEndpointId],
  );
  const label = (destinationLabel ?? "Vị trí sách").slice(0, 12);
  const labelWidth = Math.max(12, Math.min(24, label.length * 1.35 + 2.5));
  const labelX = targetPixel && targetPixel.x > map.imageWidth * 0.66
    ? targetPixel.x - labelWidth - 2
    : (targetPixel?.x ?? 0) + 2;
  const labelY = Math.max(1, (targetPixel?.y ?? 0) - 6);

  return (
    <View style={[styles.frame, frameStyle]} testID={testID}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${map.imageWidth} ${map.imageHeight}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel="Bản đồ occupancy Gazebo 2D"
      >
        <Rect x={0} y={0} width={map.imageWidth} height={map.imageHeight} fill="#f1f5f9" />
        {Array.from({ length: Math.ceil(map.imageWidth / 10) + 1 }, (_, index) => (
          <Line key={`grid-v-${index}`} x1={index * 10} y1={0} x2={index * 10} y2={map.imageHeight} stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={0.16} />
        ))}
        {Array.from({ length: Math.ceil(map.imageHeight / 10) + 1 }, (_, index) => (
          <Line key={`grid-h-${index}`} x1={0} y1={index * 10} x2={map.imageWidth} y2={index * 10} stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={0.16} />
        ))}
        {map.obstacles.map((obstacle, index) => (
          <Rect
            key={`occupied-${index}`}
            x={obstacle.pixelX}
            y={obstacle.pixelY}
            width={obstacle.pixelWidth}
            height={obstacle.pixelHeight}
            fill="#334155"
          />
        ))}
        <Rect x={0.15} y={0.15} width={map.imageWidth - 0.3} height={map.imageHeight - 0.3} fill="none" stroke="#cbd5e1" strokeWidth={0.3} />

        {routePoints.length > 1 && (
          <>
            <Polyline points={routeString} fill="none" stroke="#1d4ed8" strokeOpacity={0.18} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <Polyline points={routeString} fill="none" stroke="#2563eb" strokeWidth={0.85} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {endpointMarkers.map(({ endpoint, pixel }) => {
          const endpointLabel = endpoint.name.trim().slice(0, 16);
          const endpointLabelWidth = Math.max(10, Math.min(24, endpointLabel.length * 1.25 + 2));
          const endpointLabelX = pixel.x > map.imageWidth - endpointLabelWidth - 3
            ? pixel.x - endpointLabelWidth - 2
            : pixel.x + 2;
          const endpointLabelY = pixel.y < 6 ? pixel.y + 2.2 : pixel.y - 5;

          return (
            <G key={`library-endpoint-${endpoint.id}`}>
              <Circle cx={pixel.x} cy={pixel.y} r={2.3} fill="#047857" fillOpacity={0.16} />
              <Circle cx={pixel.x} cy={pixel.y} r={1.1} fill="#ecfdf5" stroke="#047857" strokeWidth={0.55} />
              <Rect
                x={endpointLabelX}
                y={endpointLabelY}
                width={endpointLabelWidth}
                height={3.7}
                rx={0.9}
                fill="#f0fdf4"
                stroke="#86efac"
                strokeWidth={0.22}
              />
              <SvgText
                x={endpointLabelX + 1}
                y={endpointLabelY + 2.5}
                fill="#166534"
                fontSize={1.75}
                fontWeight="700"
              >
                {endpointLabel}
              </SvgText>
            </G>
          );
        })}

        {targetPixel && destination && (
          <G>
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={3.7} fill="#f97316" fillOpacity={0.16} />
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={1.65} fill="#fff7ed" stroke="#ea580c" strokeWidth={0.65} />
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={0.55} fill="#ea580c" />
            <Rect x={labelX} y={labelY} width={labelWidth} height={4.2} rx={1.1} fill="#fff7ed" stroke="#fdba74" strokeWidth={0.25} />
            <SvgText x={labelX + 1.2} y={labelY + 2.8} fill="#9a3412" fontSize={2.15} fontWeight="700">{label}</SvgText>
          </G>
        )}

        {robotPixel && robot && (
          <G transform={`translate(${robotPixel.x} ${robotPixel.y}) rotate(${(-robot.yaw * 180) / Math.PI})`}>
            <Circle r={3.7} fill="#0ea5e9" fillOpacity={0.16} />
            <Circle r={1.9} fill="#f0f9ff" stroke="#0284c7" strokeWidth={0.7} />
            <Polygon points="2.3,0 -1.25,-1.25 -1.25,1.25" fill="#0284c7" />
          </G>
        )}

        <G>
          <Rect x={2} y={2} width={runtimeLabel ? 29 : 24} height={4.7} rx={1.4} fill="#ffffff" fillOpacity={0.94} stroke="#cbd5e1" strokeWidth={0.25} />
          <Circle cx={4.1} cy={4.35} r={0.8} fill={robotConnected ? "#10b981" : "#94a3b8"} />
          <SvgText x={5.8} y={5.2} fill="#334155" fontSize={2.25} fontWeight="700">
            {runtimeLabel ? `THƯ VIỆN · ${runtimeLabel.slice(0, 8)}` : "BẢN ĐỒ THƯ VIỆN"}
          </SvgText>
        </G>

        <G>
          <Line x1={3} y1={map.imageHeight - 4} x2={13} y2={map.imageHeight - 4} stroke="#334155" strokeWidth={0.6} />
          <Line x1={3} y1={map.imageHeight - 5} x2={3} y2={map.imageHeight - 3} stroke="#334155" strokeWidth={0.5} />
          <Line x1={13} y1={map.imageHeight - 5} x2={13} y2={map.imageHeight - 3} stroke="#334155" strokeWidth={0.5} />
          <SvgText x={14.5} y={map.imageHeight - 3.1} fill="#475569" fontSize={2.1}>0.5 m</SvgText>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: map.imageWidth / map.imageHeight,
    maxHeight: 430,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
});
