import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { POIModule } from './modules/poi/poi.module';
import { CountyModule } from './modules/county/county.module';

const REQUIRED_ENV = ['DATABASE_URL'] as const;

function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_ENV.filter(
    (name) => typeof config[name] !== 'string' || (config[name] as string).trim() === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}. ` +
        `Set it in the monorepo-root .env (copy .env.example) or the process environment.`,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Works regardless of cwd: apps/backend (npm -w) or repo root; earlier entries win.
      envFilePath: [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../.env')],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    POIModule,
    CountyModule,
  ],
})
export class AppModule {}
