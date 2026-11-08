import { Module } from "@nestjs/common";
import { AdminTokenGuard } from "./admin-token.guard";

/** Interim operator-only protection; replace with per-user RBAC before partner access. */
@Module({
  providers: [AdminTokenGuard],
  exports: [AdminTokenGuard],
})
export class AdminAuthModule {}
