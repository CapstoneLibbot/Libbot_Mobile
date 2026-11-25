import {
  CreateJobRequest,
  GuidanceJob,
  GuidanceRepository,
} from "@/features/guidance/types/guidance.types";
import { booksFixture } from "../fixtures/books.fixture";
import { sampleJobTemplate } from "../fixtures/jobs.fixture";

export class MockGuidanceRepository implements GuidanceRepository {
  private jobs: Map<string, GuidanceJob> = new Map();
  private delayMs: number;

  constructor(delayMs = 200) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async createJob(req: CreateJobRequest): Promise<GuidanceJob> {
    await this.sleep();

    const book = booksFixture.find((b) => b.id === req.bookId);
    if (!book) {
      throw new Error(
        `Sách với mã "${req.bookId}" không tồn tại trong hệ thống.`,
      );
    }

    if (!book.available) {
      throw new Error(
        `Sách "${book.title}" hiện không có sẵn trên kệ. Không thể tạo chuyến hướng dẫn.`,
      );
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newJob: GuidanceJob = {
      id: jobId,
      bookId: book.id,
      bookTitle: book.title,
      shelf: req.targetShelf ?? book.shelf,
      robotId: sampleJobTemplate.robotId,
      status: "active",
      progress: 15,
      currentPose: sampleJobTemplate.currentPose,
      destination: sampleJobTemplate.destination,
      path: sampleJobTemplate.path,
      mapVersion: sampleJobTemplate.mapVersion,
      routeRevision: sampleJobTemplate.routeRevision,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, newJob);
    return newJob;
  }

  async getJob(jobId: string): Promise<GuidanceJob | null> {
    await this.sleep();
    return this.jobs.get(jobId) ?? null;
  }

  async cancelJob(jobId: string): Promise<GuidanceJob> {
    await this.sleep();
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Không tìm thấy chuyến hướng dẫn với mã ${jobId}`);
    }
    const updated: GuidanceJob = {
      ...job,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async completeJob(jobId: string): Promise<GuidanceJob> {
    await this.sleep();
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Không tìm thấy chuyến hướng dẫn với mã ${jobId}`);
    }
    const updated: GuidanceJob = {
      ...job,
      status: "completed",
      progress: 100,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    return updated;
  }
}
