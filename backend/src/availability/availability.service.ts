import { Injectable } from '@nestjs/common';
import { addMinutes, isBefore, isValid } from 'date-fns';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface Slot {
  startUtc: string;
  endUtc: string;
  startLocal: string;
  endLocal: string;
}

export interface AvailabilityRule {
  dayOfWeek: number;
  startLocalTime: string; // e.g., "09:00:00" or "09:00"
  endLocalTime: string;
}

@Injectable()
export class AvailabilityService {
  /**
   * Generates 30-minute slots for a given date in the resource's local time,
   * completely accounting for DST, and returning UTC bounds.
   */
  generateSlots(
    dateString: string, // YYYY-MM-DD
    resourceTimezone: string,
    displayTimezone: string,
    rules: AvailabilityRule[],
  ): Slot[] {
    const slots: Slot[] = [];

    // Parse the date to determine the day of the week in the resource's timezone.
    const midnightIso = `${dateString}T00:00:00`;
    const resourceMidnightUtc = fromZonedTime(midnightIso, resourceTimezone);
    if (!isValid(resourceMidnightUtc)) {
      throw new Error('Invalid dateString');
    }

    const resourceDateZoned = toZonedTime(resourceMidnightUtc, resourceTimezone);
    const dayOfWeek = resourceDateZoned.getDay(); // 0 = Sunday, 1 = Monday

    const rule = rules.find((r) => r.dayOfWeek === dayOfWeek);
    if (!rule) {
      return slots; // No availability on this day
    }

    // Normalize time strings to ensure they map cleanly (e.g. "09:00:00" -> "09:00:00")
    // Note: The rule times should be standard time strings.
    const startIso = `${dateString}T${rule.startLocalTime}`;
    const endIso = `${dateString}T${rule.endLocalTime}`;

    // fromZonedTime natively handles DST offsets for the exact date and time.
    const startUtc = fromZonedTime(startIso, resourceTimezone);
    const endUtc = fromZonedTime(endIso, resourceTimezone);

    let currentUtc = startUtc;

    while (isBefore(currentUtc, endUtc)) {
      const nextUtc = addMinutes(currentUtc, 30);
      
      // Don't generate a slot that goes beyond the end time
      if (isBefore(endUtc, nextUtc)) {
        break;
      }

      slots.push({
        startUtc: currentUtc.toISOString(),
        endUtc: nextUtc.toISOString(),
        startLocal: formatInTimeZone(currentUtc, displayTimezone, 'HH:mm'),
        endLocal: formatInTimeZone(nextUtc, displayTimezone, 'HH:mm'),
      });

      currentUtc = nextUtc;
    }

    return slots;
  }
}
