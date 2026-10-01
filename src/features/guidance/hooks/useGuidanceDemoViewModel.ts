import { useMemo, useState } from "react";
import { StatusTone } from "../../../shared/components/StatusBadge";
import {
  sampleMissionAlternativePath,
  sampleMissionPrimaryPath,
} from "../../../mocks/missions.mock";
import {
  GuidanceDemoState,
  GuidanceMission,
  RobotPose,
} from "../types/guidance.types";

export interface GuidanceDemoPresentation {
  demoState: GuidanceDemoState;
  routeRevision: number;
  mapVersion: string;
  currentPose: RobotPose;
  destinationPose: RobotPose & { label: string };
  path: RobotPose[];
  progress: number;
  statusLabel: string;
  statusTone: StatusTone;
  instructionTitle: string;
  instructionMessage: string;
  isReplanning: boolean;
  isArrived: boolean;
  isCancelled: boolean;
  isNavigating: boolean;
}

export interface GuidanceDemoComputeInput {
  demoState: GuidanceDemoState;
  routeRevision: number;
  mission?: GuidanceMission | null;
}

export function computeGuidanceDemoPresentation({
  demoState,
  routeRevision,
  mission,
}: GuidanceDemoComputeInput): GuidanceDemoPresentation {
  const mapVersion = mission?.mapVersion ?? "library-l1-v1";

  const destinationPose = {
    x: mission?.destination?.x ?? 9.8,
    y: mission?.destination?.y ?? 7.6,
    yaw: mission?.destination?.yaw ?? 1.57,
    label: mission?.shelf ? `Kệ ${mission.shelf}` : "Kệ A-12",
  };

  let currentPose: RobotPose;
  switch (demoState) {
    case "arrived":
      currentPose = {
        x: destinationPose.x,
        y: destinationPose.y,
        yaw: destinationPose.yaw,
      };
      break;
    case "replanning":
      currentPose = { x: 5.5, y: 4.5, yaw: -1.57 };
      break;
    case "cancelled":
      currentPose = { x: 5.5, y: 4.5, yaw: 0.0 };
      break;
    case "navigating":
    default:
      currentPose = mission?.currentPose ?? { x: 5.5, y: 4.5, yaw: 0.0 };
      break;
  }

  let path: RobotPose[];
  if (demoState === "replanning") {
    path = sampleMissionAlternativePath;
  } else if (mission?.path && mission.path.length > 0) {
    path = mission.path;
  } else {
    path = sampleMissionPrimaryPath;
  }

  let progress: number;
  switch (demoState) {
    case "arrived":
      progress = 100;
      break;
    case "replanning":
    case "cancelled":
      progress = 45;
      break;
    case "navigating":
    default:
      progress = mission?.progress ?? 45;
      break;
  }

  let statusLabel: string;
  let statusTone: StatusTone;
  switch (demoState) {
    case "replanning":
      statusLabel = "Robot đang chọn lối đi an toàn";
      statusTone = "warning";
      break;
    case "arrived":
      statusLabel = "Đã đến đích thành công";
      statusTone = "success";
      break;
    case "cancelled":
      statusLabel = "Chuyến đi đã bị hủy";
      statusTone = "danger";
      break;
    case "navigating":
    default:
      statusLabel = "Đang dẫn đường đến kệ sách";
      statusTone = "info";
      break;
  }

  const shelfLabel = mission?.shelf ? `Kệ ${mission.shelf}` : "Kệ sách";
  let instructionTitle: string;
  let instructionMessage: string;

  switch (demoState) {
    case "replanning":
      instructionTitle = "Robot đang chọn lối đi an toàn:";
      instructionMessage = `Robot đang chọn lối đi an toàn (Lộ trình #${routeRevision}). Phát hiện chướng ngại vật, LiBot đang chuyển sang lối đi an toàn thay thế. Xin vui lòng đi chậm theo robot.`;
      break;
    case "arrived":
      instructionTitle = "✓ Bạn đã đến kệ sách đích!";
      instructionMessage = `LiBot đã hoàn thành nhiệm vụ dẫn đường. Vui lòng nhận sách tại ${shelfLabel} và cho biết đánh giá trải nghiệm để giúp LiBot phục vụ tốt hơn.`;
      break;
    case "cancelled":
      instructionTitle = "Hành trình đã kết thúc:";
      instructionMessage =
        "Phiên dẫn đường đã được hủy. LiBot sẽ dừng và quay lại trạm trung tâm. Bạn có thể quay lại danh sách tra cứu để tìm sách khác.";
      break;
    case "navigating":
    default:
      instructionTitle = "Vui lòng đi cùng LiBot:";
      instructionMessage = `LiBot đang dẫn bạn tới ${shelfLabel}. Xin chú ý giữ khoảng cách an toàn 1 mét và chú ý người đi bộ xung quanh.`;
      break;
  }

  return {
    demoState,
    routeRevision,
    mapVersion,
    currentPose,
    destinationPose,
    path,
    progress,
    statusLabel,
    statusTone,
    instructionTitle,
    instructionMessage,
    isReplanning: demoState === "replanning",
    isArrived: demoState === "arrived",
    isCancelled: demoState === "cancelled",
    isNavigating: demoState === "navigating",
  };
}

export interface UseGuidanceDemoViewModelResult extends GuidanceDemoPresentation {
  setDemoState: (nextState: GuidanceDemoState) => void;
  cancelLocalMission: () => void;
  completeLocalMission: () => void;
}

export function useGuidanceDemoViewModel(
  mission?: GuidanceMission | null,
): UseGuidanceDemoViewModelResult {
  const [demoState, setDemoStateInternal] =
    useState<GuidanceDemoState>("navigating");
  const [routeRevision, setRouteRevision] = useState<number>(
    mission?.routeRevision ?? 1,
  );

  const presentation = useMemo(
    () =>
      computeGuidanceDemoPresentation({
        demoState,
        routeRevision,
        mission,
      }),
    [demoState, routeRevision, mission],
  );

  const setDemoState = (nextState: GuidanceDemoState) => {
    if (nextState === "replanning") {
      setRouteRevision((prev) => prev + 1);
    }
    setDemoStateInternal(nextState);
  };

  const cancelLocalMission = () => {
    setDemoStateInternal("cancelled");
  };

  const completeLocalMission = () => {
    setDemoStateInternal("arrived");
  };

  return {
    ...presentation,
    setDemoState,
    cancelLocalMission,
    completeLocalMission,
  };
}
