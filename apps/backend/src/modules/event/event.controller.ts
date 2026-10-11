import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { EventService } from './event.service';
import { GetEventsDto } from './dto/get-events.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('api/events')
export class EventController {
  constructor(private eventService: EventService) {}

  /**
   * Get events within a viewport and optional filters.
   * GET /api/events/viewport?minLat=47.5&minLon=21.6&maxLat=47.55&maxLon=21.7&categories=concert,festival&days=7
   */
  @Get('viewport')
  async getByViewport(@Query() query: GetEventsDto) {
    const fromDate = query.days ? new Date() : undefined;
    const toDate = query.days ? new Date(Date.now() + query.days * 24 * 60 * 60 * 1000) : undefined;
    const categories = query.categories ? query.categories.split(',') : undefined;

    return this.eventService.getEventsByViewport(
      query.minLat,
      query.minLon,
      query.maxLat,
      query.maxLon,
      categories,
      query.countyId,
      fromDate,
      toDate,
    );
  }

  /**
   * Get upcoming events for a county.
   * GET /api/events/upcoming/:countyId?days=7
   */
  @Get('upcoming/:countyId')
  async getUpcoming(@Param('countyId') countyId: string, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.eventService.getUpcomingEvents(countyId, daysNum);
  }

  /**
   * Get all active events (paginated).
   * GET /api/events?limit=50&offset=0
   */
  @Get()
  async getAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.eventService.getAllEvents(limitNum, offsetNum);
  }

  /**
   * Get event by ID.
   * GET /api/events/:id
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  /**
   * Create an event (editorial or organizer).
   * POST /api/events
   */
  @Post()
  async create(@Body() data: CreateEventDto) {
    const eventData = {
      ...data,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    };
    return this.eventService.createEvent(eventData);
  }

  /**
   * Update an event.
   * PATCH /api/events/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Partial<CreateEventDto>) {
    const updateData = {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    };
    return this.eventService.updateEvent(id, updateData);
  }

  /**
   * Cancel an event.
   * PATCH /api/events/:id/cancel
   */
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.eventService.cancelEvent(id);
  }
}
