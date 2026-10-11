import { IsString, IsOptional, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class GetPOIsDto {
  @Type(() => Number)
  @IsNumber()
  minLat!: number;

  @Type(() => Number)
  @IsNumber()
  maxLat!: number;

  @Type(() => Number)
  @IsNumber()
  minLng!: number;

  @Type(() => Number)
  @IsNumber()
  maxLng!: number;

  @IsOptional()
  @IsString()
  categories?: string;

  @IsOptional()
  @IsString()
  countyId?: string;
}
