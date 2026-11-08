import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AdminTokenGuard } from "../auth/admin-token.guard";
import { GuidesService } from "./guides.service";
import { GuideContentService } from "./guide-content.service";

@Controller("api/guides")
export class GuidesController {
  constructor(private readonly guides: GuidesService, private readonly content: GuideContentService) {}

  @Get("public/:slug")
  publicGuide(@Param("slug") slug: string) {
    return this.guides.publicGuide(slug);
  }

  @Get("public/:slug/places")
  publicPlaces(@Param("slug") slug: string) {
    return this.content.publishedPlaces(slug);
  }

  @Get("operator/:id")
  @UseGuards(AdminTokenGuard)
  operatorGet(@Param("id") id: string) {
    return this.guides.operatorGet(id);
  }

  @Post("operator")
  @UseGuards(AdminTokenGuard)
  operatorCreate(@Body() body: unknown) {
    return this.guides.operatorCreate(body);
  }

  @Put("operator/:id")
  @UseGuards(AdminTokenGuard)
  operatorReplace(@Param("id") id: string, @Body() body: unknown) {
    return this.guides.operatorReplace(id, body);
  }
}
