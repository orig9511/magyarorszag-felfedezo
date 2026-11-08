import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventService } from "./event.service";
import { AdminAuthModule } from "../auth/admin-auth.module";
import { EventController } from "./event.controller";
import { Event } from "./event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Event]), AdminAuthModule],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
