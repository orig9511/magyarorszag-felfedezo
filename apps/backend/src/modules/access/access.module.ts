import { Module } from "@nestjs/common";
import { AccessController } from "./access.controller";
import { AccessGuard } from "./access.guard";
import { AccessService } from "./access.service";
@Module({controllers:[AccessController],providers:[AccessService,AccessGuard],exports:[AccessService,AccessGuard]})
export class AccessModule {}
