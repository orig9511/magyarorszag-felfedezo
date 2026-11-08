import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin-auth.module";
import { GuidesController } from "./guides.controller";
import { GuidesService } from "./guides.service";
import { GuideContentService } from "./guide-content.service";
import { AccessModule } from "../access/access.module";
import { PartnerGuidesController } from "./partner-guides.controller";
import { PartnerGuidesService } from "./partner-guides.service";
import { GuideCatalogService } from "./guide-catalog.service";
import { GuideCatalogController } from "./guide-catalog.controller";
import { GuidePublicationService } from "./guide-publication.service";
import { GuidePublicationController } from "./guide-publication.controller";

@Module({
  imports: [AdminAuthModule, AccessModule],
  providers: [GuidesService, PartnerGuidesService, GuideContentService, GuideCatalogService, GuidePublicationService],
  controllers: [GuidesController, PartnerGuidesController, GuideCatalogController, GuidePublicationController],
})
export class GuidesModule {}
