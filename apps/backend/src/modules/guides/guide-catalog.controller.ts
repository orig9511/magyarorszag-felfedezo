import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AccessGuard, AuthenticatedRequest } from "../access/access.guard";
import { GuideCatalogService } from "./guide-catalog.service";
@Controller("api/partner/catalog")
@UseGuards(AccessGuard)
export class GuideCatalogController {
 constructor(private readonly catalog:GuideCatalogService){}
 @Get()
 search(@Req() req:AuthenticatedRequest,@Query() params:Record<string,string>){
  return this.catalog.search(req.identity!,params);
 }
}
