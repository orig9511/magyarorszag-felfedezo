import { BadRequestException } from '@nestjs/common';

export function budapestDate(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addCalendarDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new BadRequestException('Date range exceeds supported calendar years');
  }
  return date.toISOString().slice(0, 10);
}

export function eventDateRange(query: { days?: number; dateFrom?: string; dateTo?: string }, now = new Date()) {
  if (query.days !== undefined && (!Number.isInteger(query.days) || query.days < 1 || query.days > 60)) {
    throw new BadRequestException('days must be an integer between 1 and 60');
  }
  if ((query.dateFrom === undefined) !== (query.dateTo === undefined)) {
    throw new BadRequestException('dateFrom and dateTo must be supplied together');
  }
  if (query.days !== undefined && query.dateFrom !== undefined) {
    throw new BadRequestException('Use days or dateFrom/dateTo, not both');
  }
  const from = query.dateFrom ?? (query.days !== undefined ? budapestDate(now) : undefined);
  const last = query.dateTo ?? (from ? addCalendarDays(from, query.days! - 1) : undefined);
  if (from && last && from > last) throw new BadRequestException('dateFrom must not be after dateTo');
  // Existing columns are timestamp WITHOUT time zone. Budapest wall-clock strings
  // avoid Date parameter encoding depending on the Node process timezone.
  return { fromDate: from ? `${from} 00:00:00` : undefined,
    toDate: last ? `${addCalendarDays(last, 1)} 00:00:00` : undefined };
}
