import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class GetPOIsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng!: number;

  // Accepts `categories=a,b`, `categories=a&categories=b`, or a single value.
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  countyId?: string;
}
