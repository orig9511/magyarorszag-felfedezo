import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin-auth.module";
import { GuidesController } from "./guides.controller";
import { GuidesService } from "./guides.service";
import { AccessModule } from "../access/access.module";
import { PartnerGuidesController } from "./partner-guides.controller";
import { PartnerGuidesService } from "./partner-guides.service";

@Module({
  imports: [AdminAuthModule, AccessModule],
  providers: [GuidesService, PartnerGuidesService],
  controllers: [GuidesController, PartnerGuidesController],
})
export class GuidesModule {}
