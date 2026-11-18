import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";
import type { GuidanceMapEndpoint, GuidanceMapZone, RobotPose } from "../types/guidance.types";
import { getOccupancyPaths, worldToGazeboPixel } from "../utils/gazeboMapCoordinates";
import {
  ContentBoundingBox,
  getContentBoundingBox,
  getRotatedMapBounds,
  inferHorizontalRotationAngle,
  rotateMapPixel,
} from "../utils/guidanceMapOrientation";
import type { GazeboMapMetadata } from "../utils/gazeboMapCoordinates";

const EMPTY_MAP: GazeboMapMetadata = {
  imageWidth: 1,
  imageHeight: 1,
  resolution: 1,
  origin: [0, 0, 0],
  obstacles: [],
};

export interface GazeboMap2DProps {
  robot?: RobotPose | null;
  robotConnected?: boolean;
  runtimeLabel?: string;
  destination?: RobotPose | null;
  destinationLabel?: string;
  mapEndpoints?: GuidanceMapEndpoint[];
  mapZones?: GuidanceMapZone[];
  selectedEndpointId?: string | null;
  path?: { x: number; y: number }[] | null;
  mapMetadata?: GazeboMapMetadata;
  frameStyle?: StyleProp<ViewStyle>;
  /** Fill the parent region while preserving the occupancy map's aspect ratio. */
  fillContainer?: boolean;
  /** Rotate the display to align the map's dominant axis horizontally. */
  autoRotate?: boolean;
  /** Explicit rotation angle in radians (e.g. -11 * Math.PI / 180 to straighten the room). Overrides autoRotate. */
  rotationAngle?: number;
  /** Crop the viewBox tightly to the room content and landmarks instead of the full raw occupancy image. */
  cropToContent?: boolean;
  /** Zoom factor (e.g. 1.0 = 100%, 1.4 = 140%). Defaults to 1.0. */
  zoom?: number;
  /** SVG preserveAspectRatio (e.g. "none" to cover full container width & height, or "xMidYMid meet"). Defaults to "xMidYMid meet". */
  preserveAspectRatio?: string;
  /** Show the map name badge tag at top-left. Defaults to false. */
  showMapTag?: boolean;
  /** Show the scale bar at bottom-left. Defaults to false. */
  showScaleBar?: boolean;
  testID?: string;
}

export function GazeboMap2D({
  robot,
  robotConnected = false,
  runtimeLabel,
  destination,
  destinationLabel,
  mapEndpoints = [],
  mapZones = [],
  selectedEndpointId,
  path,
  mapMetadata,
  frameStyle,
  fillContainer = false,
  autoRotate = false,
  rotationAngle,
  cropToContent = false,
  zoom = 1,
  preserveAspectRatio = "xMidYMid meet",
  showMapTag = false,
  showScaleBar = false,
  testID = "gazebo-map-2d",
}: GazeboMap2DProps): React.ReactElement {
  const map = mapMetadata ?? EMPTY_MAP;
  const displayRotation = rotationAngle !== undefined
    ? rotationAngle
    : autoRotate
      ? inferHorizontalRotationAngle(map.imageWidth, map.imageHeight, map.cells)
      : 0;
  const displayBounds = getRotatedMapBounds(
    map.imageWidth,
    map.imageHeight,
    displayRotation,
  );
  const displayTransform = displayRotation
    ? `translate(${displayBounds.width / 2} ${displayBounds.height / 2}) rotate(${(displayRotation * 180) / Math.PI}) translate(${-map.imageWidth / 2} ${-map.imageHeight / 2})`
    : undefined;
  const robotPixel = robot ? worldToGazeboPixel(robot, map) : null;
  const targetPixel = destination ? worldToGazeboPixel(destination, map) : null;
  const displayTargetPixel = targetPixel
    ? rotateMapPixel(
        targetPixel,
        map.imageWidth,
        map.imageHeight,
        displayRotation,
        displayBounds,
      )
    : null;
  const routePoints = useMemo(
    () => (path ?? []).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).map((point) => worldToGazeboPixel(point, map)),
    [path, map],
  );
  const routeString = routePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const occupancyPaths = useMemo(() => getOccupancyPaths(map), [map]);
  const endpointMarkers = useMemo(
    () => mapEndpoints
      .filter((endpoint) => endpoint.id !== selectedEndpointId)
      .map((endpoint) => ({ endpoint, pixel: worldToGazeboPixel(endpoint, map) }))
      .filter(({ pixel }) => (
        pixel.x >= 0 && pixel.x <= map.imageWidth
        && pixel.y >= 0 && pixel.y <= map.imageHeight
      )),
    [mapEndpoints, selectedEndpointId, map],
  );
  const zoneOverlays = useMemo(
    () => mapZones
      .filter((zone) => zone.isActive)
      .map((zone) => {
        const centerX = (zone.minX + zone.maxX) / 2;
        const centerY = (zone.minY + zone.maxY) / 2;
        const angle = zone.rotationAngle ?? 0;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const corners = zone.width != null && zone.height != null
          ? [
              [-zone.width / 2, -zone.height / 2],
              [zone.width / 2, -zone.height / 2],
              [zone.width / 2, zone.height / 2],
              [-zone.width / 2, zone.height / 2],
            ].map(([localX, localY]) => ({
              x: centerX + cosine * localX - sine * localY,
              y: centerY + sine * localX + cosine * localY,
            }))
          : [
              { x: zone.minX, y: zone.minY },
              { x: zone.maxX, y: zone.minY },
              { x: zone.maxX, y: zone.maxY },
              { x: zone.minX, y: zone.maxY },
            ];
        const pixels = corners.map((corner) => worldToGazeboPixel(corner, map));
        const color = zone.zoneType === "KEEP_OUT"
          ? "#ef4444"
          : zone.zoneType === "SPEED_LIMIT"
            ? "#f59e0b"
            : "#8b5cf6";
        const label = zone.zoneType.replaceAll("_", " ");
        const labelWidth = Math.max(10, Math.min(24, label.length * 1.15 + 2));
        const labelX = Math.max(1, Math.min(...pixels.map((point) => point.x)) + 1);
        const labelY = Math.max(1, Math.min(...pixels.map((point) => point.y)) + 1);
        return { zone, corners: pixels, color, label, labelWidth, labelX, labelY };
      }),
    [mapZones, map],
  );
  const label = (destinationLabel ?? "Vị trí sách").slice(0, 12);
  const labelWidth = Math.max(12, Math.min(24, label.length * 1.35 + 2.5));
  const labelX = displayTargetPixel && displayTargetPixel.x > displayBounds.width * 0.66
    ? displayTargetPixel.x - labelWidth - 2
    : (displayTargetPixel?.x ?? 0) + 2;
  const labelY = Math.max(1, (displayTargetPixel?.y ?? 0) - 6);

  const contentBox = useMemo<ContentBoundingBox>(() => {
    if (!cropToContent || !mapMetadata) {
      return { x: 0, y: 0, width: displayBounds.width, height: displayBounds.height };
    }
    const extraPixels: { x: number; y: number }[] = [];
    if (robotPixel) extraPixels.push(robotPixel);
    if (targetPixel) extraPixels.push(targetPixel);
    for (const ep of endpointMarkers) {
      extraPixels.push(ep.pixel);
    }
    return getContentBoundingBox(
      map.imageWidth,
      map.imageHeight,
      displayRotation,
      displayBounds,
      map.cells,
      map.obstacles,
      extraPixels,
    );
  }, [
    cropToContent,
    mapMetadata,
    map.imageWidth,
    map.imageHeight,
    displayRotation,
    displayBounds,
    map.cells,
    map.obstacles,
    robotPixel,
    targetPixel,
    endpointMarkers,
  ]);

  const [containerAspect, setContainerAspect] = useState<number | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      const nextAspect = width / height;
      setContainerAspect((prev) => {
        if (prev != null && Math.abs(prev - nextAspect) < 0.01) return prev;
        return nextAspect;
      });
    }
  };

  const zoomFactor = Math.max(0.5, Math.min(3.5, zoom ?? 1));
  let viewBoxW = contentBox.width / zoomFactor;
  let viewBoxH = contentBox.height / zoomFactor;

  if (preserveAspectRatio !== "none" && fillContainer && containerAspect && containerAspect > 0 && contentBox.height > 0) {
    const contentAspect = contentBox.width / contentBox.height;
    if (containerAspect >= contentAspect) {
      // Container is wider than the room: expand viewBox width to match container aspect ratio
      viewBoxW = viewBoxH * containerAspect;
    } else {
      // Container is taller than the room: expand viewBox height to match container aspect ratio
      viewBoxH = viewBoxW / containerAspect;
    }
  }

  const viewBoxX = contentBox.x + (contentBox.width - viewBoxW) / 2;
  const viewBoxY = contentBox.y + (contentBox.height - viewBoxH) / 2;

  if (!mapMetadata) {
    return (
      <View
        onLayout={handleLayout}
        style={[
          styles.frame,
          fillContainer ? styles.fillFrame : styles.emptyFrame,
          styles.emptyContent,
          frameStyle,
        ]}
        testID={testID}
      >
        <Text style={styles.emptyText}>Đang tải map robot…</Text>
      </View>
    );
  }

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.frame,
        fillContainer
          ? styles.fillFrame
          : [
              styles.constrainedFrame,
              { aspectRatio: map.imageWidth / map.imageHeight },
            ],
        frameStyle,
      ]}
      testID={testID}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
        preserveAspectRatio={preserveAspectRatio}
        accessibilityLabel="Bản đồ occupancy Gazebo 2D"
      >
        <Rect x={viewBoxX} y={viewBoxY} width={viewBoxW} height={viewBoxH} fill="#f1f5f9" />
        <G transform={displayTransform}>
        <Rect x={0} y={0} width={map.imageWidth} height={map.imageHeight} fill="#f1f5f9" />
        {map.cells
          ? <>
            {occupancyPaths.unknown && <Path d={occupancyPaths.unknown} fill="#94a3b8" />}
            {occupancyPaths.occupied && <Path d={occupancyPaths.occupied} fill="#334155" />}
          </>
          : map.obstacles.map((obstacle, index) => (
          <Rect
            key={`occupied-${index}`}
            x={obstacle.pixelX}
            y={obstacle.pixelY}
            width={obstacle.pixelWidth}
            height={obstacle.pixelHeight}
            fill="#334155"
          />
          ))}
        {Array.from({ length: Math.ceil(map.imageWidth / 10) + 1 }, (_, index) => (
          <Line key={`grid-v-${index}`} x1={index * 10} y1={0} x2={index * 10} y2={map.imageHeight} stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={0.16} />
        ))}
        {Array.from({ length: Math.ceil(map.imageHeight / 10) + 1 }, (_, index) => (
          <Line key={`grid-h-${index}`} x1={0} y1={index * 10} x2={map.imageWidth} y2={index * 10} stroke="#94a3b8" strokeOpacity={0.2} strokeWidth={0.16} />
        ))}
        <Rect x={0.15} y={0.15} width={map.imageWidth - 0.3} height={map.imageHeight - 0.3} fill="none" stroke="#cbd5e1" strokeWidth={0.3} />

        {zoneOverlays.map(({ zone, corners, color, label, labelWidth, labelX, labelY }) => {
          const boundedLabelX = Math.max(1, Math.min(labelX, map.imageWidth - labelWidth - 1));
          const boundedLabelY = Math.max(1, Math.min(labelY, map.imageHeight - 4.7));
          return (
            <G key={`map-zone-${zone.id}`}>
              <Polygon
                points={corners.map((point) => `${point.x},${point.y}`).join(" ")}
                fill={color}
                fillOpacity={0.2}
                stroke={color}
                strokeWidth={0.35}
              />
              <Rect
                x={boundedLabelX}
                y={boundedLabelY}
                width={labelWidth}
                height={3.7}
                rx={0.9}
                fill="#ffffff"
                fillOpacity={0.92}
                stroke={color}
                strokeWidth={0.22}
              />
              <SvgText
                x={boundedLabelX + 1}
                y={boundedLabelY + 2.5}
                fill="#334155"
                fontSize={1.75}
                fontWeight="700"
              >
                {label}
              </SvgText>
            </G>
          );
        })}

        {routePoints.length > 1 && (
          <>
            <Polyline points={routeString} fill="none" stroke="#1d4ed8" strokeOpacity={0.18} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <Polyline points={routeString} fill="none" stroke="#2563eb" strokeWidth={0.85} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {endpointMarkers.map(({ endpoint, pixel }) => {
          const endpointColor = endpoint.endpointType === "CHARGER"
            ? "#f97316"
            : endpoint.endpointType === "PARK"
              ? "#8b5cf6"
              : "#047857";
          const endpointTint = endpoint.endpointType === "CHARGER"
            ? "#fff7ed"
            : endpoint.endpointType === "PARK"
              ? "#f5f3ff"
              : "#ecfdf5";
          return (
            <G key={`library-endpoint-${endpoint.id}`}>
              <Circle cx={pixel.x} cy={pixel.y} r={2.3} fill={endpointColor} fillOpacity={0.16} />
              <Circle cx={pixel.x} cy={pixel.y} r={1.1} fill={endpointTint} stroke={endpointColor} strokeWidth={0.55} />
            </G>
          );
        })}

        {targetPixel && destination && (
          <G>
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={3.7} fill="#f97316" fillOpacity={0.16} />
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={1.65} fill="#fff7ed" stroke="#ea580c" strokeWidth={0.65} />
            <Circle cx={targetPixel.x} cy={targetPixel.y} r={0.55} fill="#ea580c" />
          </G>
        )}

        {robotPixel && robot && (
          <G transform={`translate(${robotPixel.x} ${robotPixel.y}) rotate(${(-robot.yaw * 180) / Math.PI})`}>
            <Circle r={3.7} fill="#0ea5e9" fillOpacity={0.16} />
            <Circle r={1.9} fill="#f0f9ff" stroke="#0284c7" strokeWidth={0.7} />
            <Polygon points="2.3,0 -1.25,-1.25 -1.25,1.25" fill="#0284c7" />
          </G>
        )}
        </G>

        {endpointMarkers.map(({ endpoint, pixel }) => {
          const endpointColor = endpoint.endpointType === "CHARGER"
            ? "#f97316"
            : endpoint.endpointType === "PARK"
              ? "#8b5cf6"
              : "#047857";
          const endpointTint = endpoint.endpointType === "CHARGER"
            ? "#fff7ed"
            : endpoint.endpointType === "PARK"
              ? "#f5f3ff"
              : "#ecfdf5";
          const displayPixel = rotateMapPixel(
            pixel,
            map.imageWidth,
            map.imageHeight,
            displayRotation,
            displayBounds,
          );
          const endpointLabel = endpoint.name.trim().slice(0, 16);
          const endpointLabelWidth = Math.max(10, Math.min(24, endpointLabel.length * 1.25 + 2));
          const endpointLabelX = displayPixel.x > displayBounds.width - endpointLabelWidth - 3
            ? displayPixel.x - endpointLabelWidth - 2
            : displayPixel.x + 2;
          const endpointLabelY = displayPixel.y < 6 ? displayPixel.y + 2.2 : displayPixel.y - 5;

          return (
            <G key={`library-endpoint-label-${endpoint.id}`}>
              <Rect x={endpointLabelX} y={endpointLabelY} width={endpointLabelWidth} height={3.7} rx={0.9} fill={endpointTint} stroke={endpointColor} strokeWidth={0.22} />
              <SvgText x={endpointLabelX + 1} y={endpointLabelY + 2.5} fill={endpointColor} fontSize={1.75} fontWeight="700">
                {endpointLabel}
              </SvgText>
            </G>
          );
        })}

        {displayTargetPixel && destination && (
          <G>
            <Rect x={labelX} y={labelY} width={labelWidth} height={4.2} rx={1.1} fill="#fff7ed" stroke="#fdba74" strokeWidth={0.25} />
            <SvgText x={labelX + 1.2} y={labelY + 2.8} fill="#9a3412" fontSize={2.15} fontWeight="700">{label}</SvgText>
          </G>
        )}

        {showMapTag && (
          <G>
            <Rect x={viewBoxX + 2} y={viewBoxY + 2} width={runtimeLabel ? 29 : 24} height={4.7} rx={1.4} fill="#ffffff" fillOpacity={0.94} stroke="#cbd5e1" strokeWidth={0.25} />
            <Circle cx={viewBoxX + 4.1} cy={viewBoxY + 4.35} r={0.8} fill={robotConnected ? "#10b981" : "#94a3b8"} />
            <SvgText x={viewBoxX + 5.8} y={viewBoxY + 5.2} fill="#334155" fontSize={2.25} fontWeight="700">
              {runtimeLabel ? `THƯ VIỆN · ${runtimeLabel.slice(0, 8)}` : "BẢN ĐỒ THƯ VIỆN"}
            </SvgText>
          </G>
        )}

        {showScaleBar && (
          <G>
            <Line x1={viewBoxX + 3} y1={viewBoxY + viewBoxH - 4} x2={viewBoxX + 13} y2={viewBoxY + viewBoxH - 4} stroke="#334155" strokeWidth={0.6} />
            <Line x1={viewBoxX + 3} y1={viewBoxY + viewBoxH - 5} x2={viewBoxX + 3} y2={viewBoxY + viewBoxH - 3} stroke="#334155" strokeWidth={0.5} />
            <Line x1={viewBoxX + 13} y1={viewBoxY + viewBoxH - 5} x2={viewBoxX + 13} y2={viewBoxY + viewBoxH - 3} stroke="#334155" strokeWidth={0.5} />
            <SvgText x={viewBoxX + 14.5} y={viewBoxY + viewBoxH - 3.1} fill="#475569" fontSize={2.1}>0.5 m</SvgText>
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  constrainedFrame: {
    maxHeight: 430,
  },
  fillFrame: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFrame: {
    minHeight: 220,
  },
  emptyContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: "#475569",
    textAlign: "center",
  },
});
