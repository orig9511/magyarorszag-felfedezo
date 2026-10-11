import { IsString, IsDateString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GetEventsDto {
  @Type(() => Number)
  @IsNumber()
  minLat!: number;

  @Type(() => Number)
  @IsNumber()
  minLon!: number;

  @Type(() => Number)
  @IsNumber()
  maxLat!: number;

  @Type(() => Number)
  @IsNumber()
  maxLon!: number;

  @IsOptional()
  @IsString()
  categories?: string; // Comma-separated

  @IsOptional()
  @IsString()
  countyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  days?: number; // Search events within N days from now
}
