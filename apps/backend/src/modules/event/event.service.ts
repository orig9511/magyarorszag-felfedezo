import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan, LessThan, In } from "typeorm";
import { Event } from "./event.entity";
import { GetEventsDto } from "./dto/get-events.dto";

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
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Event[]> {
    let query = this.eventRepo
      .createQueryBuilder("event")
      .where("event.status = :status", { status: "active" })
      .andWhere(
        `ST_Intersects(event.location, ST_MakeBox2D(ST_Point(:minLon, :minLat), ST_Point(:maxLon, :maxLat)))`,
        {
          minLat,
          minLon,
          maxLat,
          maxLon,
        },
      );

    if (categories && categories.length > 0) {
      query = query.andWhere("event.category IN (:categories)", { categories });
    }

    if (countyId) {
      query = query.andWhere("event.countyId = :countyId", { countyId });
    }

    if (fromDate) {
      query = query.andWhere("event.endTime >= :fromDate", { fromDate });
    }

    if (toDate) {
      query = query.andWhere("event.startTime <= :toDate", { toDate });
    }

    return query.orderBy("event.startTime", "ASC").getMany();
  }

  /**
   * Get upcoming events for a county.
   */
  async getUpcomingEvents(countyId: string, days = 7): Promise<Event[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.eventRepo.find({
      where: {
        countyId,
        status: "active",
        startTime: MoreThan(now),
        endTime: LessThan(futureDate),
      },
      order: { startTime: "ASC" },
    });
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
