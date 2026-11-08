import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin-auth.module";
import { GuidesController } from "./guides.controller";
import { GuidesService } from "./guides.service";

@Module({
  imports: [AdminAuthModule],
  providers: [GuidesService],
  controllers: [GuidesController],
})
export class GuidesModule {}
