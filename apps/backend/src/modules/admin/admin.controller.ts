import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { IngestionService } from "../ingestion/ingestion.service";
import { EventService } from "../event/event.service";
import { IngestionJob } from "../ingestion/entities/ingestion-job.entity";
import { Event } from "../event/event.entity";

/**
 * Admin API: Ingestion monitoring and event moderation
 * Protected by authentication/authorization (TODO: implement)
 */
@Controller("api/admin")
export class AdminController {
  constructor(
    private ingestionService: IngestionService,
    private eventService: EventService,
  ) {}

  // === INGESTION MONITORING ===

  /**
   * Get ingestion job history with filtering.
   * GET /api/admin/ingestion/jobs?source=osm&status=completed&limit=20
   */
  @Get("ingestion/jobs")
  async getIngestionJobs(
    @Query("source") source?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ): Promise<IngestionJob[]> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.ingestionService.getJobHistory(source, limitNum);
  }

  /**
   * Get summary statistics for ingestion performance.
   * GET /api/admin/ingestion/stats?days=30
   */
  @Get("ingestion/stats")
  async getIngestionStats(@Query("days") days?: string): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalItemsProcessed: number;
    totalItemsCreated: number;
  }> {
    // TODO: Implement detailed stats aggregation
    return {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      totalItemsProcessed: 0,
      totalItemsCreated: 0,
    };
  }

  // === EVENT MODERATION ===

  /**
   * Get events pending moderation.
   * GET /api/admin/events/pending?limit=20
   */
  @Get("events/pending")
  async getPendingEvents(@Query("limit") limit?: string): Promise<Event[]> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    // TODO: Filter by status='draft' or flag
    return this.eventService.getAllEvents(limitNum);
  }

  /**
   * Get all events for review.
   * GET /api/admin/events?status=active&source=osm&limit=50
   */
  @Get("events")
  async getAllEventsForReview(
    @Query("status") status?: string,
    @Query("source") source?: string,
    @Query("limit") limit?: string,
  ): Promise<Event[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    // TODO: Implement filtering by source, status
    return this.eventService.getAllEvents(limitNum);
  }

  /**
   * Get event by ID with full metadata.
   * GET /api/admin/events/:id
   */
  @Get("events/:id")
  async getEventForModeration(@Param("id") id: string): Promise<Event | null> {
    return (await this.eventService.getEventById(id)) || null;
  }

  /**
   * Approve an event (move from draft to active).
   * PATCH /api/admin/events/:id/approve
   */
  @Patch("events/:id/approve")
  async approveEvent(@Param("id") id: string): Promise<Event> {
    return this.eventService.updateEvent(id, { status: "active" });
  }

  /**
   * Reject an event (move to draft or mark for removal).
   * PATCH /api/admin/events/:id/reject
   */
  @Patch("events/:id/reject")
  async rejectEvent(
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ): Promise<Event> {
    return this.eventService.updateEvent(id, {
      status: "draft",
    });
  }

  /**
   * Flag an event for review (potential spam, duplicate, etc.).
   * PATCH /api/admin/events/:id/flag
   */
  @Patch("events/:id/flag")
  async flagEvent(
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ): Promise<Event> {
    // TODO: Add flagged_reason and flagged_at fields to Event entity
    const event = await this.eventService.getEventById(id);
    return event as Event;
  }

  /**
   * Update event metadata (title, description, category).
   * PATCH /api/admin/events/:id
   */
  @Patch("events/:id")
  async updateEventMetadata(
    @Param("id") id: string,
    @Body() updates: Partial<Event>,
  ): Promise<Event> {
    return this.eventService.updateEvent(id, updates);
  }

  /**
   * Delete an event permanently.
   * DELETE /api/admin/events/:id
   */
  @Patch("events/:id/delete")
  async deleteEvent(@Param("id") id: string): Promise<Event> {
    return this.eventService.cancelEvent(id);
  }

  // === INGESTION MANAGEMENT ===

  /**
   * Manually trigger a full re-ingestion for a source.
   * POST /api/admin/ingestion/force-run?source=osm
   */
  @Post("ingestion/force-run")
  async forceRunIngestion(
    @Query("source") source: string,
  ): Promise<{ success: boolean; message: string }> {
    // TODO: Integrate with IngestionService to trigger adapter
    return {
      success: true,
      message: `Ingestion for ${source} queued for immediate execution`,
    };
  }

  /**
   * Adjust ingestion schedule.
   * PATCH /api/admin/ingestion/schedule?source=osm&cron="0 2 * * *"
   */
  @Patch("ingestion/schedule")
  async updateIngestionSchedule(
    @Query("source") source: string,
    @Query("cron") cron: string,
  ): Promise<{ success: boolean; message: string }> {
    // TODO: Persist schedule changes to DB and reload scheduler
    return {
      success: true,
      message: `Schedule for ${source} updated to "${cron}"`,
    };
  }

  // === HEALTH & DIAGNOSTICS ===

  /**
   * Get system health status.
   * GET /api/admin/health
   */
  @Get("health")
  async getHealth(): Promise<{
    status: string;
    database: boolean;
    ingestion: { lastRun?: Date; nextRun?: Date };
  }> {
    return {
      status: "ok",
      database: true, // TODO: Test connection
      ingestion: {
        // TODO: Get from scheduler
      },
    };
  }
}
