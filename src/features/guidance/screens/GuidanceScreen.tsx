import {
  AlertOctagon,
  Battery,
  CheckCircle2,
  ChevronLeft,
  Compass,
  CornerUpRight,
  Minus,
  Pause,
  Play,
  Plus,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useKioskStore } from "@/core/state";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
  IndoorMap,
} from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { spacing } from "@/shared/theme";
import { DEFAULT_LIBRARY_VIEWBOX } from "@/shared/lib";
import { GuidanceDemoSwitcher } from "../components/GuidanceDemoSwitcher";
import { useGuidanceDemoViewModel } from "../hooks/useGuidanceDemoViewModel";
import { useGuidanceMission } from "../hooks/useGuidanceMission";

export interface GuidanceScreenProps {
  missionId: string;
  onGoToFeedback: (missionId: string) => void;
  onBackToSearch: () => void;
}

export function GuidanceScreen({
  missionId,
  onGoToFeedback,
  onBackToSearch,
}: GuidanceScreenProps): React.ReactElement {
  const { insets, isCompactWidth, isNarrowHeight } = useResponsiveLayout();
  // Is landscape if not compact width (>= 600) or narrow height (< 500)
  const isLandscape = !isCompactWidth || isNarrowHeight;

  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const setActiveMissionId = useKioskStore((state) => state.setActiveMissionId);

  const [isPaused, setIsPaused] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [mapContainerSize, setMapContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [, setIsInteracting] = useState(false);
  const floorLabel = "Tầng 1";

  const {
    data: mission,
    isLoading,
    isError,
    error,
    refetch,
  } = useGuidanceMission(missionId ?? "");

  const {
    demoState,
    routeRevision,
    mapVersion,
    currentPose,
    destinationPose,
    path,
    progress,
    statusLabel,
    statusTone,
    isReplanning,
    isArrived,
    isCancelled,
    isNavigating,
    setDemoState,
    cancelLocalMission,
    completeLocalMission,
  } = useGuidanceDemoViewModel(mission);

  const handleLocalCancel = () => {
    recordInteraction();
    cancelLocalMission();
    setActiveMissionId(null);
  };

  const handleLocalComplete = () => {
    recordInteraction();
    completeLocalMission();
  };

  const handleGoToFeedback = () => {
    recordInteraction();
    onGoToFeedback(missionId);
  };

  const handleBackToSearch = () => {
    recordInteraction();
    onBackToSearch();
  };

  const handleTogglePause = () => {
    recordInteraction();
    setIsPaused((prev) => !prev);
  };

  // Dynamic turn maneuver title and subtext based on status
  const maneuverTitle = useMemo(() => {
    if (isReplanning) return "Vật cản: Đang đổi lộ trình";
    if (isArrived) return `Đã đến Kệ ${mission?.shelf ?? "A-12"}`;
    if (isCancelled) return "Hành trình đã kết thúc";
    if (progress > 50) return `Rẽ phải vào Kệ ${mission?.shelf?.[0] ?? "C"}`;
    return `Đi thẳng theo LiBot (${mission?.robotId ?? "LiBot-01"})`;
  }, [isReplanning, isArrived, isCancelled, progress, mission?.shelf, mission?.robotId]);

  const estimatedDistance = useMemo(() => {
    if (isArrived) return "0 m";
    if (isCancelled) return "--";
    return `~${Math.max(2, Math.round((100 - progress) * 0.22))} m`;
  }, [isArrived, isCancelled, progress]);

  const estimatedSeconds = useMemo(() => {
    if (isArrived) return "0 giây";
    if (isCancelled) return "--";
    return `${Math.max(5, Math.round((100 - progress) * 0.7))} giây`;
  }, [isArrived, isCancelled, progress]);

  const zoomLevelRef = useRef(zoomLevel);
  const panOffsetRef = useRef(panOffset);
  const mapContainerSizeRef = useRef(mapContainerSize);
  const startPanRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef(1);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    mapContainerSizeRef.current = mapContainerSize;
  }, [mapContainerSize]);

  const handleMapLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setMapContainerSize((prev) => {
        if (
          prev &&
          Math.abs(prev.width - width) < 1 &&
          Math.abs(prev.height - height) < 1
        ) {
          return prev;
        }
        return { width, height };
      });
    }
  };

  const handleZoomIn = () => {
    recordInteraction();
    setZoomLevel((z) => Math.min(Number((z + 0.25).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    recordInteraction();
    setZoomLevel((z) => {
      const next = Math.max(1, Number((z - 0.25).toFixed(2)));
      if (next <= 1.01) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetView = () => {
    recordInteraction();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const isViewCustomized =
    zoomLevel > 1.02 || panOffset.x !== 0 || panOffset.y !== 0;

  // PanResponder handlers are invoked exclusively during touch events, never during render
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Allow pinch zoom anytime
          if (gestureState.numberActiveTouches > 1) {
            return true;
          }
          // Single-finger drag is ONLY enabled when zoomed in
          if (zoomLevelRef.current > 1.05) {
            return (
              Math.abs(gestureState.dx) > 3 ||
              Math.abs(gestureState.dy) > 3
            );
          }
          return false;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (gestureState.numberActiveTouches > 1) {
            return true;
          }
          if (zoomLevelRef.current > 1.05) {
            return (
              Math.abs(gestureState.dx) > 6 ||
              Math.abs(gestureState.dy) > 6
            );
          }
          return false;
        },
        onPanResponderGrant: (evt) => {
          isDraggingRef.current = true;
          setIsInteracting(true);
          startPanRef.current = { ...panOffsetRef.current };

          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            initialPinchDistRef.current = Math.hypot(dx, dy);
            initialZoomRef.current = zoomLevelRef.current;
          } else {
            initialPinchDistRef.current = null;
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;

          // Pinch zoom (always active with 2 fingers)
          if (touches && touches.length >= 2 && initialPinchDistRef.current) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDist = Math.hypot(dx, dy);
            if (initialPinchDistRef.current > 0) {
              const factor = currentDist / initialPinchDistRef.current;
              const targetZoom = Math.min(
                2.5,
                Math.max(1.0, initialZoomRef.current * factor),
              );
              if (targetZoom <= 1.01) {
                setPanOffset({ x: 0, y: 0 });
              }
              setZoomLevel(Number(targetZoom.toFixed(2)));
            }
            return;
          }

          // Single-finger drag / pan is ONLY allowed when zoomed in
          if (zoomLevelRef.current <= 1.05) {
            return;
          }

          const container = mapContainerSizeRef.current;
          const containerW =
            container?.width && container.width > 0
              ? container.width
              : 600;
          const containerH =
            container?.height && container.height > 0
              ? container.height
              : 400;
          const currentZoom = zoomLevelRef.current || 1;

          const viewBoxW = 1390 / currentZoom;
          const viewBoxH = 990 / currentZoom;

          // Precise 1:1 screen-to-SVG coordinate scale factor
          const svgXPerScreenPixel = viewBoxW / containerW;
          const svgYPerScreenPixel = viewBoxH / containerH;

          const newPanX =
            startPanRef.current.x -
            gestureState.dx * svgXPerScreenPixel;
          const newPanY =
            startPanRef.current.y -
            gestureState.dy * svgYPerScreenPixel;

          // Bound pan to keep the active map within viewport
          const maxPanX = Math.max(0, (1390 - viewBoxW) / 2 + 80);
          const maxPanY = Math.max(0, (990 - viewBoxH) / 2 + 60);

          const clampedX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
          const clampedY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

          setPanOffset({
            x: Math.round(clampedX),
            y: Math.round(clampedY),
          });
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
          initialPinchDistRef.current = null;
          setIsInteracting(false);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          initialPinchDistRef.current = null;
          setIsInteracting(false);
        },
      })
  );

  const mapTransform = useMemo(() => {
    const baseW = DEFAULT_LIBRARY_VIEWBOX.width; // 1390
    const baseH = DEFAULT_LIBRARY_VIEWBOX.height; // 990

    // Standard 1x view uses the complete floorplan 1390x990.
    // Combined with preserveAspectRatio="none", the map outer walls
    // stretch to cover 100% of the block without leaving any dead space.
    const viewBoxW = baseW / zoomLevel;
    const viewBoxH = baseH / zoomLevel;

    // Center of the floorplan in SVG space (695, 495)
    const centerX = baseW / 2;
    const centerY = baseH / 2;

    const activePan =
      zoomLevel > 1.05 ? panOffset : { x: 0, y: 0 };

    const viewBoxX = centerX - viewBoxW / 2 + activePan.x;
    const viewBoxY = centerY - viewBoxH / 2 + activePan.y;

    return {
      viewBox: {
        x: viewBoxX,
        y: viewBoxY,
        width: viewBoxW,
        height: viewBoxH,
      },
    };
  }, [zoomLevel, panOffset]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Hành trình dẫn đường" />
        <AppLoading message="Đang kết nối hệ thống điều hướng robot..." />
      </View>
    );
  }

  if (isError || !mission) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Hành trình dẫn đường"
          onBack={onBackToSearch}
        />
        {isError ? (
          <AppErrorState
            title="Lỗi theo dõi hành trình"
            message={error?.message ?? "Không thể tìm thấy chuyến đi."}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Chuyến đi không tồn tại"
            message="Mã hành trình không hợp lệ hoặc đã kết thúc."
            actionTitle="Quay lại tra cứu"
            onAction={onBackToSearch}
          />
        )}
      </View>
    );
  }

  // ── Header Bar ─────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View
      style={[
        styles.headerBar,
        {
          paddingTop: Math.max(insets.top, spacing.xs) + 4,
          paddingLeft: Math.max(insets.left, spacing.md),
          paddingRight: Math.max(insets.right, spacing.md),
        },
      ]}
    >
      {/* Left: Back button + Title + Status + Floor */}
      <View style={styles.headerLeftGroup}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleBackToSearch}
          style={styles.backButton}
        >
          <ChevronLeft size={18} color="#334155" strokeWidth={2.5} />
          <AppText variant="caption" style={styles.backButtonText}>
            Quay lại
          </AppText>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <AppText variant="subtitle" style={styles.headerTitle} numberOfLines={1}>
            Dẫn đường: {mission.robotId}
          </AppText>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadgePill,
              statusTone === "info" && styles.statusBadgeInfo,
              statusTone === "warning" && styles.statusBadgeWarning,
              statusTone === "success" && styles.statusBadgeSuccess,
              statusTone === "danger" && styles.statusBadgeDanger,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                statusTone === "info" && { backgroundColor: "#10B981" },
                statusTone === "warning" && { backgroundColor: "#F59E0B" },
                statusTone === "success" && { backgroundColor: "#10B981" },
                statusTone === "danger" && { backgroundColor: "#EF4444" },
              ]}
            />
            <AppText
              variant="caption"
              style={[
                styles.statusBadgeText,
                statusTone === "info" && { color: "#065F46" },
                statusTone === "warning" && { color: "#92400E" },
                statusTone === "success" && { color: "#065F46" },
                statusTone === "danger" && { color: "#991B1B" },
              ]}
            >
              {statusLabel}
            </AppText>
          </View>

          <AppText variant="caption" style={styles.headerFloorText} numberOfLines={1}>
            • {floorLabel} ({mapVersion})
          </AppText>
        </View>
      </View>

      {/* Right: Demo Switcher (compact) + Battery + Speed */}
      <View style={styles.headerRightGroup}>
        <GuidanceDemoSwitcher
          compact
          currentState={demoState}
          onSelectState={setDemoState}
          routeRevision={routeRevision}
        />

        <View style={styles.telemetryChipBattery}>
          <Battery size={14} color="#059669" />
          <AppText variant="caption" style={styles.telemetryTextBattery}>
            88%
          </AppText>
        </View>

        <View style={styles.telemetryChipSpeed}>
          <Zap size={14} color="#2563EB" />
          <AppText variant="caption" style={styles.telemetryTextSpeed}>
            0.8 m/s
          </AppText>
        </View>
      </View>
    </View>
  );

  // ── Left Map Canvas ────────────────────────────────────────────────────────
  const renderMapCanvas = () => (
    <View
      style={styles.mapCardContainer}
      onLayout={handleMapLayout}
      {...panResponder.panHandlers}
    >
      {/* Top-left Floating Chips */}
      {isViewCustomized && (
        <View style={styles.mapTopLeftChips} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đặt lại góc nhìn bản đồ"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={handleResetView}
            style={styles.mapChipResetPill}
          >
            <Compass size={12} color="#2563EB" />
            <AppText variant="caption" style={styles.mapChipResetText}>
              Về trung tâm ({Math.round(zoomLevel * 100)}%)
            </AppText>
          </Pressable>
        </View>
      )}

      {/* Top-right Floating Zoom Controls */}
      <View style={styles.mapZoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Phóng to bản đồ"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={handleZoomIn}
          style={styles.zoomButton}
        >
          <Plus size={16} color="#334155" />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thu nhỏ bản đồ"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={handleZoomOut}
          disabled={zoomLevel <= 1}
          style={[styles.zoomButton, zoomLevel <= 1 && styles.zoomButtonDisabled]}
        >
          <Minus size={16} color={zoomLevel <= 1 ? "#94A3B8" : "#334155"} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đặt lại góc nhìn"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={handleResetView}
          style={[styles.zoomButton, isViewCustomized && styles.zoomButtonActive]}
        >
          <Compass size={16} color={isViewCustomized ? "#2563EB" : "#64748B"} />
        </Pressable>
      </View>

      {/* Main IndoorMap SVG (covers 100% of container block) */}
      <IndoorMap
        detailLevel="navigation"
        viewportMode="overview"
        transform={mapTransform}
        mapVersion={mapVersion}
        robotPose={currentPose}
        destinationPose={destinationPose}
        path={path}
        missionStatus={demoState}
        routeRevision={routeRevision}
        showLegend={false}
        aspectRatio={undefined}
        preserveAspectRatio="none"
        style={styles.mapSvgComponent}
      />

      {/* Drag hint badge when zoomed */}
      {zoomLevel > 1 && (
        <View style={styles.mapDragHintBadge} pointerEvents="none">
          <AppText variant="caption" style={styles.mapDragHintText}>
            Vuốt để di chuyển bản đồ
          </AppText>
        </View>
      )}
    </View>
  );

  // ── Right Navigation Sidebar (or Bottom Content on Portrait) ───────────────
  const renderSidebarContent = () => (
    <View style={styles.sidebarInner}>
      {/* 1. Chỉ dẫn trực tiếp (Turn Maneuver Card) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chỉ dẫn trực tiếp"
        accessibilityHint="Nhấn để mô phỏng LiBot đã đến nơi"
        onPress={isNavigating || isReplanning ? handleLocalComplete : undefined}
        style={[
          styles.maneuverCard,
          isReplanning && styles.maneuverCardReplanning,
          isArrived && styles.maneuverCardArrived,
        ]}
      >
        <View style={styles.maneuverHeaderRow}>
          <View
            style={[
              styles.maneuverIconBox,
              isReplanning && styles.maneuverIconBoxWarning,
              isArrived && styles.maneuverIconBoxSuccess,
            ]}
          >
            {isArrived ? (
              <CheckCircle2 size={22} color="#FFFFFF" />
            ) : isReplanning ? (
              <AlertOctagon size={22} color="#FFFFFF" />
            ) : (
              <CornerUpRight size={22} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </View>

          <View style={styles.maneuverHeaderRight}>
            <View style={styles.maneuverTagRow}>
              <AppText
                variant="caption"
                style={[
                  styles.maneuverTagText,
                  isReplanning && { color: "#B45309" },
                  isArrived && { color: "#15803D" },
                ]}
              >
                CHỈ DẪN TRỰC TIẾP
              </AppText>
              <AppText variant="subtitle" style={styles.maneuverDistanceText}>
                {estimatedDistance}
              </AppText>
            </View>

            <AppText
              variant="subtitle"
              style={styles.maneuverMainText}
              numberOfLines={2}
            >
              {maneuverTitle}
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* 2. Tiến độ hành trình */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeaderRow}>
          <View style={styles.progressHeaderLeft}>
            <CheckCircle2 size={16} color="#10B981" />
            <AppText variant="subtitle" style={styles.progressLabel}>
              Tiến độ hành trình
            </AppText>
          </View>
          <AppText variant="subtitle" style={styles.progressValueText}>
            {progress}% ({estimatedSeconds})
          </AppText>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(Math.max(progress, 5), 100)}%`,
                backgroundColor: isArrived
                  ? "#10B981"
                  : isReplanning
                    ? "#F59E0B"
                    : "#2563EB",
              },
            ]}
          />
        </View>
      </View>

      {/* 3. Thông tin sách & Kệ (Book Details Card) */}
      <View style={styles.bookCard}>
        <View style={styles.bookThumbnail}>
          <AppText variant="caption" style={styles.bookThumbLabelTop}>
            BOOK
          </AppText>
          <View style={styles.bookThumbLine} />
          <AppText variant="caption" style={styles.bookThumbLabelBottom}>
            TECH
          </AppText>
        </View>

        <View style={styles.bookInfoRight}>
          <View style={styles.bookBadgeRow}>
            <View style={styles.shelfBadge}>
              <AppText variant="caption" style={styles.shelfBadgeText}>
                Kệ {mission.shelf ?? "A-12"}
              </AppText>
            </View>
            <AppText variant="caption" style={styles.shelfSubLocation}>
              Ngăn 3 • {floorLabel}
            </AppText>
          </View>

          <AppText variant="subtitle" style={styles.bookTitle} numberOfLines={1}>
            {mission.bookTitle ?? "Clean Architecture"}
          </AppText>

          <AppText variant="caption" style={styles.bookAuthor} numberOfLines={1}>
            Robert C. Martin (Uncle Bob)
          </AppText>
        </View>
      </View>

      {/* 4. Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        {/* Button 1: Tạm dừng / Tiếp tục */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPaused ? "Tiếp tục" : "Tạm dừng"}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={handleTogglePause}
          style={({ pressed }) => [
            styles.actionButtonSecondary,
            pressed && styles.actionButtonPressed,
          ]}
        >
          {isPaused ? (
            <Play size={16} color="#334155" />
          ) : (
            <Pause size={16} color="#334155" />
          )}
          <AppText variant="caption" style={styles.actionButtonSecondaryText}>
            {isPaused ? "Tiếp tục" : "Tạm dừng"}
          </AppText>
        </Pressable>

        {/* Button 2: Dừng khẩn hoặc Mô phỏng hoàn tất */}
        {isArrived ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đánh giá dịch vụ"
            onPress={handleGoToFeedback}
            style={({ pressed }) => [
              styles.actionButtonSuccess,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppText variant="caption" style={styles.actionButtonPrimaryText}>
              Đánh giá dịch vụ →
            </AppText>
          </Pressable>
        ) : isCancelled ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại tra cứu"
            onPress={handleBackToSearch}
            style={({ pressed }) => [
              styles.actionButtonPrimary,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppText variant="caption" style={styles.actionButtonPrimaryText}>
              Tìm sách khác
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dừng khẩn"
            onPress={handleLocalCancel}
            style={({ pressed }) => [
              styles.actionButtonDanger,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AlertOctagon size={16} color="#FFFFFF" />
            <AppText variant="caption" style={styles.actionButtonPrimaryText}>
              Dừng khẩn
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );

  // =========================================================================
  // MAIN RENDER: Landscape (2 Columns) vs Portrait (Stacked)
  // =========================================================================
  return (
    <View style={styles.container}>
      {renderHeader()}

      {isLandscape ? (
        /* Landscape 2-Column Split: Left Map (62%) + Right Sidebar (38%) */
        <View
          style={[
            styles.landscapeBody,
            {
              paddingLeft: Math.max(insets.left, spacing.md),
              paddingRight: Math.max(insets.right, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.xs) + 6,
            },
          ]}
        >
          <View style={styles.landscapeMapCol}>{renderMapCanvas()}</View>
          <ScrollView
            style={styles.landscapeSidebarCol}
            contentContainerStyle={styles.landscapeSidebarScroll}
            showsVerticalScrollIndicator={false}
          >
            {renderSidebarContent()}
          </ScrollView>
        </View>
      ) : (
        /* Portrait Stacked: Map (flexible) + Bottom Sidebar */
        <View
          style={[
            styles.portraitBody,
            {
              paddingLeft: Math.max(insets.left, spacing.md),
              paddingRight: Math.max(insets.right, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.sm),
            },
          ]}
        >
          <View style={styles.portraitMapWrapper}>{renderMapCanvas()}</View>
          <ScrollView
            style={styles.portraitBottomScroll}
            contentContainerStyle={styles.portraitBottomContent}
            showsVerticalScrollIndicator={false}
          >
            {renderSidebarContent()}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // ── Header Bar ─────────────────────────────────────────────────────────────
  headerBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    zIndex: 10,
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    minHeight: 36,
  },
  backButtonText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 13,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flexShrink: 1,
  },
  headerTitle: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 15,
  },
  statusBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeInfo: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusBadgeWarning: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusBadgeSuccess: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusBadgeDanger: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 11,
  },
  headerFloorText: {
    color: "#64748B",
    fontSize: 12,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  telemetryChipBattery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    minHeight: 32,
  },
  telemetryTextBattery: {
    fontWeight: "700",
    color: "#059669",
    fontSize: 12,
  },
  telemetryChipSpeed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    minHeight: 32,
  },
  telemetryTextSpeed: {
    fontWeight: "700",
    color: "#2563EB",
    fontSize: 12,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "700",
    color: "#DC2626",
    fontSize: 12,
  },
  // ── Landscape Body ─────────────────────────────────────────────────────────
  landscapeBody: {
    flex: 1,
    flexDirection: "row",
    paddingTop: 8,
    gap: 12,
  },
  landscapeMapCol: {
    flex: 1.6,
    width: "100%",
    height: "100%",
  },
  landscapeSidebarCol: {
    flex: 1,
    maxWidth: 390,
  },
  landscapeSidebarScroll: {
    paddingBottom: 8,
  },
  // ── Portrait Body ──────────────────────────────────────────────────────────
  portraitBody: {
    flex: 1,
    paddingTop: 8,
    gap: 10,
  },
  portraitMapWrapper: {
    flex: 1.1,
    width: "100%",
    minHeight: 280,
  },
  portraitBottomScroll: {
    flex: 1,
  },
  portraitBottomContent: {
    paddingBottom: 16,
  },
  // ── Map Container & Floating Chips ─────────────────────────────────────────
  mapCardContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
  },
  mapSvgComponent: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F8FAFC",
  },
  mapTopLeftChips: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  mapChipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  mapChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  mapChipText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 11,
  },
  mapChipResetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  mapChipResetText: {
    fontWeight: "700",
    color: "#2563EB",
    fontSize: 11,
  },
  mapZoomControls: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  zoomButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  mapBottomLeftChip: {
    position: "absolute",
    bottom: 8,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  },
  slamGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  slamText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
  },
  mapDragHintBadge: {
    position: "absolute",
    bottom: 8,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  mapDragHintText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  // ── Sidebar Inner Cards ────────────────────────────────────────────────────
  sidebarInner: {
    gap: 10,
  },
  // 1. Maneuver Card
  maneuverCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    padding: 12,
  },
  maneuverCardReplanning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  maneuverCardArrived: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  maneuverHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  maneuverIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  maneuverIconBoxWarning: {
    backgroundColor: "#D97706",
  },
  maneuverIconBoxSuccess: {
    backgroundColor: "#10B981",
  },
  maneuverHeaderRight: {
    flex: 1,
    gap: 2,
  },
  maneuverTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  maneuverTagText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  maneuverDistanceText: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 14,
  },
  maneuverMainText: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 15,
    marginTop: 1,
  },
  // 2. Progress Section
  progressSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  progressLabel: {
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 13,
  },
  progressValueText: {
    fontWeight: "800",
    color: "#2563EB",
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  // 3. Book Card
  bookCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bookThumbnail: {
    width: 44,
    height: 56,
    backgroundColor: "#1E1B4B",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  bookThumbLabelTop: {
    color: "#93C5FD",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bookThumbLine: {
    width: 20,
    height: 1,
    backgroundColor: "#4338CA",
  },
  bookThumbLabelBottom: {
    color: "#CBD5E1",
    fontSize: 8,
    fontWeight: "700",
  },
  bookInfoRight: {
    flex: 1,
    gap: 2,
  },
  bookBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shelfBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shelfBadgeText: {
    color: "#B45309",
    fontWeight: "800",
    fontSize: 11,
  },
  shelfSubLocation: {
    color: "#64748B",
    fontSize: 11,
  },
  bookTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 14,
  },
  bookAuthor: {
    color: "#64748B",
    fontSize: 12,
  },
  // 4. Action Buttons Row
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  actionButtonSecondary: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  actionButtonSecondaryText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 12,
  },
  actionButtonDanger: {
    flex: 1.2,
    minHeight: 40,
    backgroundColor: "#E11D48",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  actionButtonSuccess: {
    flex: 1.5,
    minHeight: 40,
    backgroundColor: "#10B981",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonPrimary: {
    flex: 1.5,
    minHeight: 40,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonPrimaryText: {
    fontWeight: "700",
    color: "#FFFFFF",
    fontSize: 12,
  },
  actionButtonPressed: {
    opacity: 0.82,
  },
});
