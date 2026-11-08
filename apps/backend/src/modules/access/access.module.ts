import { Module } from "@nestjs/common";
import { AccessController } from "./access.controller";
import { AccessGuard } from "./access.guard";
import { AccessThrottleGuard } from "./access-throttle.guard";
import { AccessService } from "./access.service";
@Module({controllers:[AccessController],providers:[AccessService,AccessGuard,AccessThrottleGuard],exports:[AccessService,AccessGuard]})
export class AccessModule {}
