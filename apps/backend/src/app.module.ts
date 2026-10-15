import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { POIModule } from "./modules/poi/poi.module";
import { CountyModule } from "./modules/county/county.module";
import { EventModule } from "./modules/event/event.module";
import { SettlementModule } from "./modules/settlement/settlement.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { AdminModule } from "./modules/admin/admin.module";
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
        synchronize: process.env.NODE_ENV === "development",
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
  ],
})
export class AppModule {}
