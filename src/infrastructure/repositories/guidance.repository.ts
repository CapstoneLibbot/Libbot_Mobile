import {
  CreateMissionRequest,
  GuidanceMission,
} from '../../features/guidance/types/guidance.types';
import { booksMock } from '../../mocks/books.mock';
import { sampleMissionTemplate } from '../../mocks/missions.mock';

export interface GuidanceRepository {
  createMission(req: CreateMissionRequest): Promise<GuidanceMission>;
  getMission(missionId: string): Promise<GuidanceMission | null>;
  cancelMission(missionId: string): Promise<GuidanceMission>;
  completeMission(missionId: string): Promise<GuidanceMission>;
}

export class MockGuidanceRepository implements GuidanceRepository {
  private missions: Map<string, GuidanceMission> = new Map();
  private delayMs: number;

  constructor(delayMs = 200) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async createMission(req: CreateMissionRequest): Promise<GuidanceMission> {
    await this.sleep();

    const book = booksMock.find((b) => b.id === req.bookId);
    if (!book) {
      throw new Error(`Sách với mã "${req.bookId}" không tồn tại trong hệ thống.`);
    }

    if (!book.available) {
      throw new Error(
        `Sách "${book.title}" hiện không có sẵn trên kệ. Không thể tạo chuyến hướng dẫn.`,
      );
    }

    const missionId = `mission-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newMission: GuidanceMission = {
      id: missionId,
      bookId: book.id,
      bookTitle: book.title,
      shelf: book.shelf,
      robotId: sampleMissionTemplate.robotId,
      status: 'active',
      progress: 15,
      currentPose: sampleMissionTemplate.currentPose,
      destination: sampleMissionTemplate.destination,
      path: sampleMissionTemplate.path,
      createdAt: now,
      updatedAt: now,
    };

    this.missions.set(missionId, newMission);
    return newMission;
  }

  async getMission(missionId: string): Promise<GuidanceMission | null> {
    await this.sleep();
    return this.missions.get(missionId) ?? null;
  }

  async cancelMission(missionId: string): Promise<GuidanceMission> {
    await this.sleep();
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Không tìm thấy chuyến hướng dẫn với mã ${missionId}`);
    }
    const updated: GuidanceMission = {
      ...mission,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    this.missions.set(missionId, updated);
    return updated;
  }

  async completeMission(missionId: string): Promise<GuidanceMission> {
    await this.sleep();
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Không tìm thấy chuyến hướng dẫn với mã ${missionId}`);
    }
    const updated: GuidanceMission = {
      ...mission,
      status: 'completed',
      progress: 100,
      updatedAt: new Date().toISOString(),
    };
    this.missions.set(missionId, updated);
    return updated;
  }
}

export const guidanceRepository: GuidanceRepository = new MockGuidanceRepository();
