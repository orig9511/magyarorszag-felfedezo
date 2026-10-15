import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsInt, Min, Max, Matches, IsISO8601, MaxLength } from 'class-validator';
// Reject empty, repeated and non-decimal query values rather than coercing them to zero.
const numeric = ({ value }: { value: unknown }) => typeof value === 'string' &&
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) ? Number(value) : value;
export class GetEventsDto {
  @Transform(numeric) @IsNumber() @Min(-90) @Max(90)
  minLat!: number;
  @Transform(numeric) @IsNumber() @Min(-180) @Max(180)
  minLon!: number;
  @Transform(numeric) @IsNumber() @Min(-90) @Max(90)
  maxLat!: number;
  @Transform(numeric) @IsNumber() @Min(-180) @Max(180)
  maxLon!: number;
  @IsOptional() @IsString() @MaxLength(500)
  @Matches(/^[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*$/)
  categories?: string;
  @IsOptional() @IsString() @MaxLength(100)
  countyId?: string;
  @IsOptional() @Transform(numeric) @IsInt() @Min(1) @Max(60)
  days?: number;
  // Inclusive Budapest calendar dates.
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true })
  dateFrom?: string;
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true })
  dateTo?: string;
}
