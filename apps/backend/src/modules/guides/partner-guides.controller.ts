import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { AccessGuard, AuthenticatedRequest } from "../access/access.guard";
import { PartnerGuidesService } from "./partner-guides.service";

@Controller("api/partner/guides")
@UseGuards(AccessGuard)
export class PartnerGuidesController {
 constructor(private readonly guides:PartnerGuidesService){}
 @Post() create(@Req() req:AuthenticatedRequest,@Body() body:unknown) {
  return this.guides.create(req.identity!,body);
 }
 @Get(":id") get(@Req() req:AuthenticatedRequest,@Param("id") id:string) {
  return this.guides.get(req.identity!,id);
 }
 @Put(":id") update(@Req() req:AuthenticatedRequest,@Param("id") id:string,@Body() body:unknown) {
  return this.guides.update(req.identity!,id,body);
 }
}
