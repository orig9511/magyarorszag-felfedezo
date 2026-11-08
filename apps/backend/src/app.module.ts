import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { POIModule } from "./modules/poi/poi.module";
import { CountyModule } from "./modules/county/county.module";
import { EventModule } from "./modules/event/event.module";
import { SettlementModule } from "./modules/settlement/settlement.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { AdminModule } from "./modules/admin/admin.module";
import { GuidesModule } from "./modules/guides/guides.module";
import { environmentFiles, requireDatabaseUrl } from "./environment.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentFiles,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: requireDatabaseUrl(configService.get("DATABASE_URL")),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        // Never mutate the database schema as a side effect of application startup.
        // Apply reviewed SQL/TypeORM migrations in an explicit, backed-up operation.
        synchronize: false,
        migrationsRun: false,
        logging: process.env.NODE_ENV === "development",
      }),
      inject: [ConfigService],
    }),
    POIModule,
    CountyModule,
    EventModule,
    SettlementModule,
    IngestionModule,
    AdminModule,
    GuidesModule,
  ],
})
export class AppModule {}
