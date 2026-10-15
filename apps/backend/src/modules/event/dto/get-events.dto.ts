import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  IsArray,
} from "class-validator";

export class GetEventsDto {
  @IsNumber()
  minLat!: number;

  @IsNumber()
  minLon!: number;

  @IsNumber()
  maxLat!: number;

  @IsNumber()
  maxLon!: number;

  @IsOptional()
  @IsString()
  categories?: string; // Comma-separated

  @IsOptional()
  @IsString()
  countyId?: string;

  @IsOptional()
  @IsNumber()
  days?: number; // Search events within N days from now
}
