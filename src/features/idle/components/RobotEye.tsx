import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors, shadows } from "../../../shared/theme";

export interface RobotEyeProps {
  eyeId: "left" | "right";
  gazeX: Animated.Value;
  gazeY: Animated.Value;
  blinkScaleY: Animated.Value;
  width?: number;
  height?: number;
}

export function RobotEye({
  eyeId,
  gazeX,
  gazeY,
  blinkScaleY,
  width = 124,
  height = 150,
}: RobotEyeProps): React.ReactElement {
  const pupilGradId = `pupil-grad-${eyeId}`;
  const highlightGradId = `pupil-hi-${eyeId}`;

  const bezelWidth = width + 8;
  const bezelHeight = height + 8;

  return (
    <Animated.View
      style={[
        styles.eyeWrapper,
        {
          transform: [{ scaleY: blinkScaleY }],
        },
      ]}
    >
      {/* Outer subtle bezel ring giving elevated 3D kiosk visor depth */}
      <View
        style={[
          styles.outerBezel,
          {
            width: bezelWidth,
            height: bezelHeight,
            borderRadius: bezelWidth / 2,
          },
        ]}
      >
        {/* Eye socket with white surface and brand blue rim */}
        <View
          style={[
            styles.eyeSocket,
            {
              width,
              height,
              borderRadius: width / 2,
            },
          ]}
        >
          {/* Animated Iris & Pupil container that moves according to gaze offset */}
          <Animated.View
            style={[
              styles.pupilContainer,
              {
                transform: [{ translateX: gazeX }, { translateY: gazeY }],
              },
            ]}
          >
            <Svg width={92} height={112} viewBox="0 0 92 112">
              <Defs>
                {/* Deep glossy dark blue & black radial gradient with ambient rim */}
                <RadialGradient
                  id={pupilGradId}
                  cx="50%"
                  cy="40%"
                  rx="55%"
                  ry="55%"
                  fx="45%"
                  fy="36%"
                >
                  <Stop offset="0%" stopColor="#0E1E38" />
                  <Stop offset="60%" stopColor="#070C18" />
                  <Stop offset="88%" stopColor="#002966" stopOpacity="0.85" />
                  <Stop
                    offset="100%"
                    stopColor={colors.primary}
                    stopOpacity="0.9"
                  />
                </RadialGradient>

                {/* Primary white specular highlight gradient */}
                <LinearGradient
                  id={highlightGradId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
                </LinearGradient>
              </Defs>

              {/* Base Iris / Pupil */}
              <Ellipse
                cx={46}
                cy={56}
                rx={44}
                ry={54}
                fill={`url(#${pupilGradId})`}
              />

              {/* Inner glowing blue rim */}
              <Ellipse
                cx={46}
                cy={56}
                rx={43}
                ry={53}
                stroke={colors.primary}
                strokeWidth={1.5}
                strokeOpacity={0.4}
                fill="none"
              />

              {/* Main glossy reflection highlight (top-left) */}
              <Ellipse
                cx={32}
                cy={36}
                rx={13}
                ry={18}
                fill={`url(#${highlightGradId})`}
                transform="rotate(-18, 32, 36)"
              />

              {/* Secondary soft reflection (bottom-right) */}
              <Circle
                cx={62}
                cy={74}
                r={6.5}
                fill="#FFFFFF"
                fillOpacity={0.65}
              />

              {/* Tertiary micro specular point */}
              <Circle cx={28} cy={58} r={3} fill="#FFFFFF" fillOpacity={0.45} />
            </Svg>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eyeWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerBezel: {
    padding: 3,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  eyeSocket: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pupilContainer: {
    width: 92,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
});
