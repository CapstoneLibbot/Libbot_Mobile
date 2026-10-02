import React, { useMemo } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useResponsiveLayout } from "../layout";
import { colors, spacing } from "../theme";
import {
  calculateIndoorMapViewport,
  DEFAULT_INDOOR_TRANSFORM,
  DEFAULT_LIBRARY_BOUNDS,
  DEFAULT_LIBRARY_VIEWBOX,
  formatPolylinePoints,
  IndoorMapTransform,
  IndoorMapViewportMode,
  projectRosToSvg,
  rosYawToSvgRotationDeg,
} from "../lib";

export type IndoorMapDetailLevel = "navigation" | "overview";

export interface IndoorMapPose {
  x: number;
  y: number;
  yaw?: number;
  label?: string;
}

export interface IndoorMapProps {
  mapVersion?: string;
  transform?: Partial<IndoorMapTransform>;
  robotPose?: IndoorMapPose;
  destinationPose?: IndoorMapPose;
  path?: IndoorMapPose[];
  missionStatus?:
    "navigating" | "replanning" | "arrived" | "cancelled" | string;
  routeRevision?: number;
  showLegend?: boolean;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  detailLevel?: IndoorMapDetailLevel;
  viewportMode?: IndoorMapViewportMode;
}

export function IndoorMap({
  mapVersion = "library-l1-v1",
  transform,
  robotPose = { x: 5.5, y: 4.5, yaw: 0.0 },
  destinationPose = { x: 9.8, y: 7.6, yaw: 1.57, label: "Kệ A-12" },
  path = [],
  missionStatus = "navigating",
  routeRevision = 1,
  showLegend = true,
  aspectRatio = 1390 / 990,
  style,
  testID = "indoor-map",
  detailLevel = "overview",
  viewportMode = "overview",
}: IndoorMapProps): React.ReactElement {
  const { isCompactWidth } = useResponsiveLayout();

  const mapTransform: IndoorMapTransform = useMemo(() => {
    return {
      ...DEFAULT_INDOOR_TRANSFORM,
      ...transform,
      bounds: {
        ...DEFAULT_LIBRARY_BOUNDS,
        ...transform?.bounds,
      },
      viewBox: {
        ...DEFAULT_LIBRARY_VIEWBOX,
        ...transform?.viewBox,
      },
      mapVersion: mapVersion ?? DEFAULT_INDOOR_TRANSFORM.mapVersion,
    };
  }, [mapVersion, transform]);

  const { bounds, viewBox } = mapTransform;

  // Active ViewBox for SVG (cropped for 'follow', full for 'overview')
  const activeViewBox = useMemo(() => {
    return calculateIndoorMapViewport({
      viewportMode,
      robotPose,
      destinationPose,
      path,
      bounds,
      baseViewBox: viewBox,
    });
  }, [viewportMode, robotPose, destinationPose, path, bounds, viewBox]);

  // Project robot and destination coordinates
  const robotSvg = useMemo(
    () => projectRosToSvg(robotPose, bounds, viewBox),
    [robotPose, bounds, viewBox],
  );

  const destinationSvg = useMemo(
    () => projectRosToSvg(destinationPose, bounds, viewBox),
    [destinationPose, bounds, viewBox],
  );

  const robotHeadingDeg = useMemo(
    () => rosYawToSvgRotationDeg(robotPose.yaw ?? 0, "right"),
    [robotPose.yaw],
  );

  const polylinePoints = useMemo(() => {
    if (!path || path.length === 0) return "";
    return formatPolylinePoints(path, bounds, viewBox);
  }, [path, bounds, viewBox]);

  // Projected waypoint dots
  const waypoints = useMemo(() => {
    if (!path || path.length === 0) return [];
    return path.map((pt) => projectRosToSvg(pt, bounds, viewBox));
  }, [path, bounds, viewBox]);

  // Route styling depending on status
  const isReplanning = missionStatus === "replanning";
  const isCancelled = missionStatus === "cancelled";
  const isArrived = missionStatus === "arrived";
  const isNavigation = detailLevel === "navigation";

  // Distance between robot and destination to avoid label collision
  const distToDestination = useMemo(() => {
    return Math.hypot(
      robotSvg.x - destinationSvg.x,
      robotSvg.y - destinationSvg.y,
    );
  }, [robotSvg.x, robotSvg.y, destinationSvg.x, destinationSvg.y]);

  // When robot is very close to destination (or arrived), hide robot label to avoid clashing with destination pill
  const showRobotLabel = !isArrived && distToDestination >= 100;

  const routeStrokeColor = isReplanning
    ? "#D97706" // amber for replanning detour
    : isCancelled
      ? "#94A3B8" // muted slate for cancelled
      : isArrived
        ? colors.success
        : colors.mapRoute;

  const routeGlowColor = isReplanning
    ? "#FDE68A"
    : isCancelled
      ? "#E2E8F0"
      : isArrived
        ? colors.successSoft
        : colors.primarySoft;

  const routeDashArray = isReplanning
    ? "16,8"
    : isCancelled
      ? "10,10"
      : undefined;
  const routeOpacity = isCancelled ? 0.35 : 0.95;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        aspectRatio ? { aspectRatio } : undefined,
        style,
      ]}
      accessible={true}
      accessibilityLabel={`Bản đồ mặt bằng thư viện ${mapVersion}`}
    >
      <Svg
        viewBox={`${activeViewBox.x} ${activeViewBox.y} ${activeViewBox.width} ${activeViewBox.height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient
            id="kioskGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient
            id="studyGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#DCFCE7" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#F0FDF4" stopOpacity="0.8" />
          </LinearGradient>
          <LinearGradient
            id="shelfGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#FFFBEB" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* 1. Floor Base */}
        <Rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill="#F8FAFC"
          rx="16"
        />

        {/* 2. Grid lines (omitted in navigation mode for clean minimal map) */}
        {!isNavigation && (
          <G testID="map-grid-lines">
            {[
              100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
              1300,
            ].map((xVal) => (
              <Line
                key={`grid-x-${xVal}`}
                x1={xVal}
                y1={20}
                x2={xVal}
                y2={970}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity={0.6}
              />
            ))}
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((yVal) => (
              <Line
                key={`grid-y-${yVal}`}
                x1={20}
                y1={yVal}
                x2={1370}
                y2={yVal}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity={0.6}
              />
            ))}
          </G>
        )}

        {/* 3. Outer Walls */}
        <Rect
          x="20"
          y="20"
          width="1350"
          height="950"
          rx="12"
          fill="none"
          stroke="#475569"
          strokeWidth="8"
        />

        {/* 4. Entrance & Kiosk Area (Bottom-left) */}
        <Rect
          x="40"
          y="650"
          width="350"
          height="300"
          rx="10"
          fill="url(#kioskGradient)"
          stroke="#93C5FD"
          strokeWidth={isNavigation ? 1.5 : 2}
          strokeDasharray={isNavigation ? undefined : "6,4"}
        />
        <SvgText
          x="215"
          y={isNavigation ? 800 : 680}
          fill="#1E40AF"
          fontSize={isNavigation ? 14 : 14}
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          {isNavigation ? "LỐI VÀO / KIOSK" : "LỐI VÀO & KIOSK TRA CỨU"}
        </SvgText>

        {!isNavigation && (
          <>
            {/* Kiosk Station dock icon */}
            <Rect
              x="190"
              y="780"
              width="60"
              height="60"
              rx="8"
              fill="#3B82F6"
              stroke="#1D4ED8"
              strokeWidth="2"
            />
            <SvgText
              x="220"
              y="816"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              KIOSK
            </SvgText>
            <SvgText
              x="220"
              y="860"
              fill="#64748B"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              (Trạm sạc & Điểm xuất phát)
            </SvgText>
          </>
        )}

        {/* 5. Circulation & Help Desk (Bottom-center) */}
        <Rect
          x="440"
          y="700"
          width="330"
          height="250"
          rx="10"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth={isNavigation ? 1.5 : 2}
        />
        <SvgText
          x="605"
          y={isNavigation ? 825 : 730}
          fill="#334155"
          fontSize={isNavigation ? 13 : 14}
          fontWeight="700"
          textAnchor="middle"
        >
          {isNavigation ? "BÀN THỦ THƯ" : "QUẦY DỊCH VỤ THỦ THƯ"}
        </SvgText>
        {!isNavigation && (
          <>
            <Rect
              x="470"
              y="750"
              width="270"
              height="40"
              rx="6"
              fill="#E2E8F0"
            />
            <SvgText
              x="605"
              y="775"
              fill="#64748B"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              Bàn tiếp nhận & Mượn trả sách
            </SvgText>
          </>
        )}

        {/* 6. Study & Reading Lounge (Bottom-right) */}
        <Rect
          x="820"
          y="620"
          width="530"
          height="330"
          rx="10"
          fill="url(#studyGradient)"
          stroke="#86EFAC"
          strokeWidth={isNavigation ? 1.5 : 2}
        />
        <SvgText
          x="1085"
          y={isNavigation ? 785 : 655}
          fill="#166534"
          fontSize={isNavigation ? 13 : 14}
          fontWeight="700"
          textAnchor="middle"
        >
          {isNavigation ? "KHU TỰ HỌC" : "KHU VỰC TỰ HỌC & ĐỌC SÁCH"}
        </SvgText>
        {!isNavigation && (
          <>
            {/* Study Tables */}
            <Rect
              x="860"
              y="680"
              width="120"
              height="70"
              rx="6"
              fill="#BBF7D0"
            />
            <Rect
              x="1030"
              y="680"
              width="120"
              height="70"
              rx="6"
              fill="#BBF7D0"
            />
            <Rect
              x="1200"
              y="680"
              width="120"
              height="70"
              rx="6"
              fill="#BBF7D0"
            />
            <Rect
              x="940"
              y="790"
              width="160"
              height="80"
              rx="6"
              fill="#BBF7D0"
            />
            <SvgText
              x="1020"
              y="835"
              fill="#15803D"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              Bàn tự học nhóm
            </SvgText>
          </>
        )}

        {/* 7. Central Navigable Corridor */}
        {!isNavigation && (
          <SvgText
            x="700"
            y="580"
            fill="#94A3B8"
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="2"
          >
            — HÀNH LANG DI CHUYỂN CHÍNH —
          </SvgText>
        )}

        {/* 8. Bookshelf Rows (Top Area) */}
        {/* Row A */}
        <G>
          <Rect
            x="130"
            y="70"
            width="240"
            height="390"
            rx="10"
            fill="url(#shelfGradient)"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <SvgText
            x="250"
            y={isNavigation ? 265 : 105}
            fill="#B45309"
            fontSize={isNavigation ? 18 : 14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {isNavigation ? "KỆ A" : "DÃY KỆ A"}
          </SvgText>
          {!isNavigation && (
            <>
              <SvgText
                x="250"
                y="125"
                fill="#78350F"
                fontSize="11"
                fontWeight="500"
                textAnchor="middle"
              >
                (A01 - A12 | Kỹ thuật & CNTT)
              </SvgText>
              {[145, 195, 245, 295, 345, 395].map((sY, idx) => (
                <Rect
                  key={`shelf-a-${idx}`}
                  x="150"
                  y={sY}
                  width="200"
                  height="30"
                  rx="4"
                  fill="#FDE68A"
                  stroke="#D97706"
                  strokeWidth="1"
                />
              ))}
            </>
          )}
        </G>

        {/* Row B */}
        <G>
          <Rect
            x="450"
            y="70"
            width="240"
            height="390"
            rx="10"
            fill="url(#shelfGradient)"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <SvgText
            x="570"
            y={isNavigation ? 265 : 105}
            fill="#B45309"
            fontSize={isNavigation ? 18 : 14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {isNavigation ? "KỆ B" : "DÃY KỆ B"}
          </SvgText>
          {!isNavigation && (
            <>
              <SvgText
                x="570"
                y="125"
                fill="#78350F"
                fontSize="11"
                fontWeight="500"
                textAnchor="middle"
              >
                (B01 - B12 | Khoa học tự nhiên)
              </SvgText>
              {[145, 195, 245, 295, 345, 395].map((sY, idx) => (
                <Rect
                  key={`shelf-b-${idx}`}
                  x="470"
                  y={sY}
                  width="200"
                  height="30"
                  rx="4"
                  fill="#FDE68A"
                  stroke="#D97706"
                  strokeWidth="1"
                />
              ))}
            </>
          )}
        </G>

        {/* Row C */}
        <G>
          <Rect
            x="770"
            y="70"
            width="250"
            height="390"
            rx="10"
            fill="url(#shelfGradient)"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <SvgText
            x="895"
            y={isNavigation ? 265 : 105}
            fill="#B45309"
            fontSize={isNavigation ? 18 : 14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {isNavigation ? "KỆ C" : "DÃY KỆ C"}
          </SvgText>
          {!isNavigation && (
            <>
              <SvgText
                x="895"
                y="125"
                fill="#78350F"
                fontSize="11"
                fontWeight="500"
                textAnchor="middle"
              >
                (C01 - C12 | Kinh tế & Xã hội)
              </SvgText>
              {[145, 195, 245, 295, 345, 395].map((sY, idx) => (
                <Rect
                  key={`shelf-c-${idx}`}
                  x="790"
                  y={sY}
                  width="210"
                  height="30"
                  rx="4"
                  fill="#FDE68A"
                  stroke="#D97706"
                  strokeWidth="1"
                />
              ))}
            </>
          )}
        </G>

        {/* Row D */}
        <G>
          <Rect
            x="1100"
            y="70"
            width="240"
            height="390"
            rx="10"
            fill="url(#shelfGradient)"
            stroke="#F59E0B"
            strokeWidth="2"
          />
          <SvgText
            x="1220"
            y={isNavigation ? 265 : 105}
            fill="#B45309"
            fontSize={isNavigation ? 18 : 14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {isNavigation ? "KỆ D" : "DÃY KỆ D"}
          </SvgText>
          {!isNavigation && (
            <>
              <SvgText
                x="1220"
                y="125"
                fill="#78350F"
                fontSize="11"
                fontWeight="500"
                textAnchor="middle"
              >
                (D01 - D12 | Văn học & Tạp chí)
              </SvgText>
              {[145, 195, 245, 295, 345, 395].map((sY, idx) => (
                <Rect
                  key={`shelf-d-${idx}`}
                  x="1120"
                  y={sY}
                  width="200"
                  height="30"
                  rx="4"
                  fill="#FDE68A"
                  stroke="#D97706"
                  strokeWidth="1"
                />
              ))}
            </>
          )}
        </G>

        {/* 9. Replanning Obstacle Marker (Visible only during replanning state) */}
        {isReplanning && (
          <G>
            {/* Pulsing warning halo */}
            <Circle cx="750" cy="540" r="32" fill="#FEE2E2" opacity={0.7} />
            <Circle
              cx="750"
              cy="540"
              r="24"
              fill="#EF4444"
              stroke="#B91C1C"
              strokeWidth="3"
            />
            {/* Caution exclamation symbol */}
            <SvgText
              x="750"
              y="548"
              fill="#FFFFFF"
              fontSize="22"
              fontWeight="900"
              textAnchor="middle"
            >
              !
            </SvgText>
            {/* Warning tag */}
            <Rect
              x="675"
              y="580"
              width="150"
              height="26"
              rx="6"
              fill="#DC2626"
            />
            <SvgText
              x="750"
              y="597"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
            >
              VẬT CẢN TẠM THỜI
            </SvgText>
          </G>
        )}

        {/* 10. Route Polyline Glow & Main Stroke */}
        {polylinePoints ? (
          <G>
            {/* Wide glow background */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={routeGlowColor}
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
            />
            {/* Core Route Line */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={routeStrokeColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={routeDashArray}
              opacity={routeOpacity}
            />
            {/* Waypoint beads along path (omitted in navigation mode for clean map) */}
            {!isNavigation &&
              waypoints.map((wp, index) => (
                <Circle
                  key={`wp-${index}`}
                  cx={wp.x}
                  cy={wp.y}
                  r="6"
                  fill="#FFFFFF"
                  stroke={routeStrokeColor}
                  strokeWidth="3"
                  opacity={routeOpacity}
                />
              ))}
          </G>
        ) : null}

        {/* 11. Destination Marker */}
        <G>
          {/* Target halo */}
          <Circle
            cx={destinationSvg.x}
            cy={destinationSvg.y}
            r="32"
            fill={colors.destination}
            opacity={0.2}
          />
          {/* Target circle outer */}
          <Circle
            cx={destinationSvg.x}
            cy={destinationSvg.y}
            r="20"
            fill="#FFFFFF"
            stroke={colors.destination}
            strokeWidth="3.5"
          />
          {/* Bullseye inner */}
          <Circle
            cx={destinationSvg.x}
            cy={destinationSvg.y}
            r="10"
            fill={colors.destination}
          />
          <Circle
            cx={destinationSvg.x}
            cy={destinationSvg.y}
            r="4"
            fill="#FFFFFF"
          />
          {/* Destination Label Pill */}
          <Rect
            x={destinationSvg.x - 65}
            y={destinationSvg.y - 48}
            width="130"
            height="26"
            rx="6"
            fill={colors.destination}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <SvgText
            x={destinationSvg.x}
            y={destinationSvg.y - 31}
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            {destinationPose.label ?? "Kệ đích"}
          </SvgText>
        </G>

        {/* 12. LiBot Robot Marker (Heading from yaw) */}
        <G>
          {/* Robot outer soft aura */}
          <Circle
            cx={robotSvg.x}
            cy={robotSvg.y}
            r="38"
            fill={colors.robot}
            opacity={0.18}
          />
          {/* Robot base disk with heading rotation */}
          <G
            transform={`translate(${robotSvg.x}, ${robotSvg.y}) rotate(${robotHeadingDeg})`}
          >
            {/* Outer casing */}
            <Circle
              cx="0"
              cy="0"
              r="24"
              fill="#FFFFFF"
              stroke={colors.robot}
              strokeWidth="3.5"
            />
            {/* Robot body core */}
            <Circle cx="0" cy="0" r="16" fill={colors.robot} />
            <Circle cx="0" cy="0" r="8" fill="#FFFFFF" />
            <Circle cx="0" cy="0" r="4" fill={colors.robot} />

            {/* Directional heading wedge pointing along heading direction */}
            <Polygon
              points="24,0 13,-8 16,0 13,8"
              fill={colors.robot}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </G>

          {/* Robot Label Pill (hidden near destination to avoid collision with destination label) */}
          {showRobotLabel && (
            <G>
              <Rect
                x={robotSvg.x - 36}
                y={robotSvg.y + 30}
                width="72"
                height="22"
                rx="6"
                fill="#0F172A"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <SvgText
                x={robotSvg.x}
                y={robotSvg.y + 45}
                fill="#FFFFFF"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                LiBot
              </SvgText>
            </G>
          )}
        </G>
      </Svg>

      {/* 13. Map Info & Legend Bar (Vietnamese, omitted in navigation mode) */}
      {showLegend && !isNavigation && (
        <View
          style={[
            styles.legendContainer,
            isCompactWidth && styles.legendContainerCompact,
          ]}
        >
          <View
            style={[
              styles.legendRow,
              isCompactWidth && styles.legendRowCompact,
            ]}
          >
            {/* Robot Legend */}
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.robot }]}
              />
              <Text style={styles.legendText}>LiBot</Text>
            </View>

            {/* Destination Legend */}
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.destination },
                ]}
              />
              <Text style={styles.legendText}>
                Kệ đích ({destinationPose.label ?? "A-12"})
              </Text>
            </View>

            {/* Route Legend */}
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendLine,
                  { backgroundColor: routeStrokeColor },
                  isReplanning && styles.legendLineDashed,
                ]}
              />
              <Text style={styles.legendText}>
                {isReplanning
                  ? `Lộ trình tránh (#${routeRevision})`
                  : isCancelled
                    ? "Lộ trình dừng"
                    : "Lộ trình di chuyển"}
              </Text>
            </View>
          </View>

          {/* Map version badge */}
          <View style={styles.mapVersionBadge}>
            <Text style={styles.mapVersionText}>{mapVersion} • 13.9×9.9m</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  legendContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  legendContainerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  legendRowCompact: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLine: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  legendLineDashed: {
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  mapVersionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
  },
  mapVersionText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.subtext,
  },
});
