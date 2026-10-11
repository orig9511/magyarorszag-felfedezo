import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { POIModule } from "./modules/poi/poi.module";
import { CountyModule } from "./modules/county/county.module";
import { EventModule } from "./modules/event/event.module";
import { SettlementModule } from "./modules/settlement/settlement.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is required for backend startup.');
        }
        return {
          type: "postgres" as const,
          url: databaseUrl,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          synchronize: process.env.NODE_ENV === "development",
          logging: process.env.NODE_ENV === "development",
        };
      },
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
