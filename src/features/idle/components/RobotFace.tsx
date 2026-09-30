import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, spacing } from "../../../shared/theme";
import {
  GLANCE_TARGETS,
  ROBOT_EYE_DIMENSIONS,
} from "../constants/robotFaceConfig";
import { RobotEye } from "./RobotEye";

export interface RobotFaceRef {
  triggerTouchReaction: (onComplete?: () => void) => void;
}

export interface RobotFaceProps {
  style?: object;
}

export const RobotFace = forwardRef<RobotFaceRef, RobotFaceProps>(
  function RobotFace({ style }, ref): React.ReactElement {
    const gazeX = useRef(new Animated.Value(0)).current;
    const gazeY = useRef(new Animated.Value(0)).current;
    const blinkScaleY = useRef(new Animated.Value(1)).current;
    const faceScale = useRef(new Animated.Value(1)).current;

    const isMounted = useRef(true);
    const isInteracting = useRef(false);
    const glanceIndex = useRef(0);

    const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const doubleBlinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const glanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isReduceMotion, setIsReduceMotion] = useState(false);

    // Check system Reduce Motion preference
    useEffect(() => {
      isMounted.current = true;

      if (AccessibilityInfo?.isReduceMotionEnabled) {
        AccessibilityInfo.isReduceMotionEnabled()
          .then((enabled) => {
            if (isMounted.current) {
              setIsReduceMotion(Boolean(enabled));
            }
          })
          .catch(() => {});
      }

      const subscription = AccessibilityInfo?.addEventListener?.(
        "reduceMotionChanged",
        (enabled: boolean) => {
          if (isMounted.current) {
            setIsReduceMotion(Boolean(enabled));
          }
        }
      );

      return () => {
        isMounted.current = false;
        subscription?.remove?.();
      };
    }, []);

    // Natural blink animation sequence
    const executeBlink = useCallback(
      (onDone?: () => void) => {
        if (!isMounted.current || isInteracting.current || isReduceMotion) {
          onDone?.();
          return;
        }

        Animated.sequence([
          Animated.timing(blinkScaleY, {
            toValue: 0.05,
            duration: 85,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(blinkScaleY, {
            toValue: 1,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isMounted.current) {
            onDone?.();
          }
        });
      },
      [blinkScaleY, isReduceMotion]
    );

    // Schedule periodic blinks (every 3-6s, with occasional double-blink)
    const scheduleNextBlink = useCallback(() => {
      if (!isMounted.current || isInteracting.current || isReduceMotion) return;

      const delay = 3000 + Math.random() * 3000;
      blinkTimerRef.current = setTimeout(() => {
        if (!isMounted.current || isInteracting.current) return;

        executeBlink(() => {
          // ~22% chance of a double blink
          if (Math.random() < 0.22) {
            doubleBlinkTimerRef.current = setTimeout(() => {
              if (!isMounted.current || isInteracting.current) return;
              executeBlink(() => {
                scheduleNextBlink();
              });
            }, 90);
          } else {
            scheduleNextBlink();
          }
        });
      }, delay);
    }, [executeBlink, isReduceMotion]);

    // Schedule subtle natural glances
    const scheduleNextGlance = useCallback(() => {
      if (!isMounted.current || isInteracting.current || isReduceMotion) return;

      const target = GLANCE_TARGETS[glanceIndex.current % GLANCE_TARGETS.length];
      glanceIndex.current += 1;

      Animated.parallel([
        Animated.timing(gazeX, {
          toValue: target.x,
          duration: 650,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(gazeY, {
          toValue: target.y,
          duration: 650,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || !isMounted.current || isInteracting.current) return;

        const jitter = Math.random() * 400 - 200;
        glanceTimerRef.current = setTimeout(() => {
          scheduleNextGlance();
        }, Math.max(1000, target.holdMs + jitter));
      });
    }, [gazeX, gazeY, isReduceMotion]);

    // Start background idle animations when mounted
    useEffect(() => {
      if (isReduceMotion) return;

      scheduleNextBlink();
      scheduleNextGlance();

      return () => {
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        if (doubleBlinkTimerRef.current)
          clearTimeout(doubleBlinkTimerRef.current);
        if (glanceTimerRef.current) clearTimeout(glanceTimerRef.current);

        gazeX.stopAnimation();
        gazeY.stopAnimation();
        blinkScaleY.stopAnimation();
        faceScale.stopAnimation();
      };
    }, [
      isReduceMotion,
      scheduleNextBlink,
      scheduleNextGlance,
      gazeX,
      gazeY,
      blinkScaleY,
      faceScale,
    ]);

    // Touch reaction: eyes widen, gaze centres on user, face scales joyfully
    const triggerTouchReaction = useCallback(
      (onComplete?: () => void) => {
        if (isInteracting.current) return;
        isInteracting.current = true;

        // Clear ongoing loops
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        if (doubleBlinkTimerRef.current)
          clearTimeout(doubleBlinkTimerRef.current);
        if (glanceTimerRef.current) clearTimeout(glanceTimerRef.current);

        gazeX.stopAnimation();
        gazeY.stopAnimation();
        blinkScaleY.stopAnimation();

        // If reduced motion is requested, immediately transition
        if (isReduceMotion) {
          onComplete?.();
          return;
        }

        // Center gaze and trigger joyful face scale
        Animated.parallel([
          Animated.spring(gazeX, {
            toValue: 0,
            tension: 90,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(gazeY, {
            toValue: 0,
            tension: 90,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(blinkScaleY, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(faceScale, {
              toValue: 1.14,
              duration: 160,
              easing: Easing.out(Easing.back(1.6)),
              useNativeDriver: true,
            }),
            Animated.timing(faceScale, {
              toValue: 1.05,
              duration: 120,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished) {
            onComplete?.();
          } else {
            onComplete?.();
          }
        });
      },
      [blinkScaleY, faceScale, gazeX, gazeY, isReduceMotion]
    );

    useImperativeHandle(
      ref,
      () => ({
        triggerTouchReaction,
      }),
      [triggerTouchReaction]
    );

    return (
      <View
        style={[styles.faceWrapper, style]}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden={true}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              transform: [{ scale: faceScale }],
            },
          ]}
        >
          {/* Eyes row */}
          <View style={styles.eyesRow}>
            <RobotEye
              eyeId="left"
              gazeX={gazeX}
              gazeY={gazeY}
              blinkScaleY={blinkScaleY}
              width={ROBOT_EYE_DIMENSIONS.socketWidth}
              height={ROBOT_EYE_DIMENSIONS.socketHeight}
            />
            <View style={styles.eyeSpacer} />
            <RobotEye
              eyeId="right"
              gazeX={gazeX}
              gazeY={gazeY}
              blinkScaleY={blinkScaleY}
              width={ROBOT_EYE_DIMENSIONS.socketWidth}
              height={ROBOT_EYE_DIMENSIONS.socketHeight}
            />
          </View>

          {/* Friendly curved smile */}
          <View style={styles.smileContainer}>
            <Svg width={88} height={28} viewBox="0 0 88 28">
              <Path
                d="M 12 6 Q 44 26 76 6"
                stroke={colors.text}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  faceWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  animatedContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  eyesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeSpacer: {
    width: ROBOT_EYE_DIMENSIONS.eyeGap,
  },
  smileContainer: {
    marginTop: spacing.lg + 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
