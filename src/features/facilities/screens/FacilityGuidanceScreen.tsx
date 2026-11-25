import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { seedEndpointQueryCache } from "@/features/guidance/hooks/useRobotMapOverlays";
import { GuidanceScreen } from "@/features/guidance/screens/GuidanceScreen";
import { AppEmptyState, AppErrorState, AppHeader, AppLoading } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useFacility } from "../hooks/useFacility";

export interface FacilityGuidanceScreenProps {
  facilityId: string;
  onGoToFeedback: (jobId: string) => void;
  onBack: () => void;
}

export function FacilityGuidanceScreen({
  facilityId,
  onGoToFeedback,
  onBack,
}: FacilityGuidanceScreenProps): React.ReactElement {
  const { data: facility, isLoading, isError, error, refetch } = useFacility(facilityId);

  useEffect(() => {
    if (!facility) return;
    seedEndpointQueryCache({
      ...facility.location.endpoint,
      mapId: facility.location.mapId,
    });
  }, [facility]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Dẫn đường đến khu vực" onBack={onBack} />
        <AppLoading message="Đang tải thông tin khu vực…" />
      </View>
    );
  }

  if (isError || !facility) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Dẫn đường đến khu vực" onBack={onBack} />
        {isError ? (
          <AppErrorState
            title="Không thể tải khu vực"
            message={error?.message ?? "Không thể kết nối với hệ thống."}
            onRetry={refetch}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy khu vực"
            message="Địa điểm này không còn hoạt động hoặc đã bị xóa."
            actionTitle="Quay lại"
            onAction={onBack}
          />
        )}
      </View>
    );
  }

  return (
    <GuidanceScreen
      endpointId={facility.location.endpoint.endpointId}
      facilityId={facility.id}
      initialQuery={facility.name}
      guidanceKind="LOCATION_GUIDANCE"
      onGoToFeedback={onGoToFeedback}
      onBackToSearch={onBack}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
