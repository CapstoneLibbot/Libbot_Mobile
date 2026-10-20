import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Polygon } from "react-native-svg";
import { AppText } from "@/shared/ui";
import { colors, radius, spacing } from "@/shared/theme";
import { buildOccupancyGridPaths } from "../utils/occupancyGridPaths";
import type { LiveOccupancyGrid, Pose2D } from "../types/robotMapping.types";

export interface LiveRobotOccupancyMapProps {
  grid: LiveOccupancyGrid | null;
  robotPose?: Pose2D | null;
  mappingActive: boolean;
  height: number;
}

export function LiveRobotOccupancyMap({
  grid,
  robotPose,
  mappingActive,
  height,
}: LiveRobotOccupancyMapProps): React.ReactElement {
  const paths = useMemo(() => grid ? buildOccupancyGridPaths(grid) : null, [grid]);
  const robotCell = useMemo(() => {
    if (!grid || !robotPose) return null;
    const dx = robotPose.x - grid.originX;
    const dy = robotPose.y - grid.originY;
    const cosine = Math.cos(grid.originYaw);
    const sine = Math.sin(grid.originYaw);
    const x = (cosine * dx + sine * dy) / grid.resolution;
    const y = grid.height - (-sine * dx + cosine * dy) / grid.resolution;
    if (x < 0 || y < 0 || x > grid.width || y > grid.height) return null;
    return { x, y };
  }, [grid, robotPose]);

  return (
    <View style={[styles.frame, { height }]}>
      {grid && paths ? (
        <>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${grid.width} ${grid.height}`}
            preserveAspectRatio="xMidYMid meet"
            accessibilityLabel="Bản đồ occupancy grid trực tiếp từ robot"
          >
            <Path d={`M0 0h${grid.width}v${grid.height}H0z`} fill="#9CA3AF" />
            {paths.free ? <Path d={paths.free} fill="#F8FAFC" /> : null}
            {paths.occupied ? <Path d={paths.occupied} fill="#1F2937" /> : null}
            {robotCell ? (
              <G transform={`translate(${robotCell.x} ${robotCell.y}) rotate(${-robotPose!.yaw * 180 / Math.PI})`}>
                <Circle r={Math.max(2.5, Math.min(grid.width, grid.height) * 0.012)} fill="#2563EB" stroke="#FFFFFF" strokeWidth={0.9} />
                <Polygon
                  points="7,0 -4,-4 -4,4"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth={0.7}
                  transform={`scale(${Math.max(0.55, Math.min(grid.width, grid.height) / 240)})`}
                />
              </G>
            ) : null}
          </Svg>
          <View style={styles.caption}>
            <AppText variant="caption" color={colors.surface}>
              {grid.width} × {grid.height} px · {grid.resolution.toFixed(3)} m/px
            </AppText>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <AppText variant="subtitle" style={styles.emptyTitle}>Chưa nhận được map từ robot</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            {mappingActive
              ? "SLAM đang chạy nhưng backend chưa nhận topic /map. Kiểm tra SLAM Toolbox và LiDAR trên robot."
              : "Bật mapping để bắt đầu nhận occupancy grid trực tiếp."}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#9CA3AF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  empty: {
    maxWidth: 440,
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
