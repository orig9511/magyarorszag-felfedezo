import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "./event.entity";
import { eventDateRange } from "./event-date-range";

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
  ) {}

  /**
   * Get events within a viewport and time range.
   */
  async getEventsByViewport(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    categories?: string[],
    countyId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<Event[]> {
    let query = this.eventRepo
      .createQueryBuilder("event")
      // Return actual instants from the existing Budapest wall-clock columns,
      // independently of the timezone of the Node/PostgreSQL host.
      .addSelect("event.startTime AT TIME ZONE 'Europe/Budapest'", 'event_startTime')
      .addSelect("event.endTime AT TIME ZONE 'Europe/Budapest'", 'event_endTime')
      .where("event.status = :status", { status: "active" })
      .andWhere(
        `ST_Intersects(event.location, ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326))`,
        {
          minLat,
          minLon,
          maxLat,
          maxLon,
        },
      );

    if (categories && categories.length > 0) {
      query = query.andWhere("event.category IN (:...categories)", { categories });
    }

    if (countyId) {
      query = query.andWhere("event.countyId = :countyId", { countyId });
    }

    if (fromDate) {
      query = query.andWhere("(COALESCE(event.endTime, event.startTime) > :fromDate OR event.startTime >= :fromDate)", { fromDate });
    }

    if (toDate) {
      query = query.andWhere("event.startTime < :toDate", { toDate });
    }

    return query.orderBy("event.startTime", "ASC").getMany();
  }

  /**
   * Get upcoming events for a county.
   */
  async getUpcomingEvents(countyId: string, days = 7): Promise<Event[]> {
    const { fromDate, toDate } = eventDateRange({ days });
    return this.eventRepo.createQueryBuilder('event')
      .addSelect("event.startTime AT TIME ZONE 'Europe/Budapest'", 'event_startTime')
      .addSelect("event.endTime AT TIME ZONE 'Europe/Budapest'", 'event_endTime')
      .where('event.status = :status', { status: 'active' })
      .andWhere('event.countyId = :countyId', { countyId })
      .andWhere('(COALESCE(event.endTime, event.startTime) > :fromDate OR event.startTime >= :fromDate)', { fromDate })
      .andWhere('event.startTime < :toDate', { toDate })
      .orderBy('event.startTime', 'ASC').getMany();
  }

  /**
   * Get all active events.
   */
  async getAllEvents(limit = 100, offset = 0): Promise<Event[]> {
    return this.eventRepo.find({
      where: { status: "active" },
      order: { startTime: "ASC" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Create an event (editorial or organizer submission).
   */
  async createEvent(data: Partial<Event>): Promise<Event> {
    const event = this.eventRepo.create(data);
    return this.eventRepo.save(event);
  }

  /**
   * Update an event.
   */
  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    await this.eventRepo.update(id, data);
    return this.eventRepo.findOneOrFail({ where: { id } });
  }

  /**
   * Soft-delete an event by marking as cancelled.
   */
  async cancelEvent(id: string, reason?: string): Promise<Event> {
    return this.updateEvent(id, {
      status: "cancelled",
      statusChangedAt: new Date(),
    });
  }

  /**
   * Get event by ID.
   */
  async getEventById(id: string): Promise<Event | null> {
    return this.eventRepo.findOne({ where: { id } });
  }
}
