import { IsString, IsOptional, IsNumber, IsUUID, IsArray } from 'class-validator';

export class GetPOIsDto {
  @IsNumber()
  minLat!: number;

  @IsNumber()
  maxLat!: number;

  @IsNumber()
  minLng!: number;

  @IsNumber()
  maxLng!: number;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsString()
  countyId?: string;
}
