import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, And } from 'typeorm';
import { addMinutes, isBefore, isValid } from 'date-fns';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Resource } from '../resources/resource.entity';
import { Booking } from '../bookings/booking.entity';

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
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) { }

  async getAvailability(resourceId: string, dateString: string, displayTimezone: string) {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['availabilities'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    let rawSlots: Slot[] = [];
    try {
      rawSlots = this.generateSlots(dateString, resource.timezone, displayTimezone, resource.availabilities);
    } catch (error) {
      throw new BadRequestException('Invalid date provided');
    }

    if (rawSlots.length === 0) {
      return {
        resource: { id: resource.id, name: resource.name, timezone: resource.timezone },
        date: dateString,
        displayTimezone,
        slots: [],
      };
    }

    // Determine the absolute bounds of the generated slots to optimize DB query
    const firstSlotStartUtc = rawSlots[0].startUtc;
    const lastSlotEndUtc = rawSlots[rawSlots.length - 1].endUtc;

    // Fetch confirmed bookings overlapping with our entire generated range
    const existingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.resource_id = :resourceId', { resourceId })
      .andWhere('booking.status = :status', { status: 'CONFIRMED' })
      .andWhere('booking.start_time < :end', { end: lastSlotEndUtc })
      .andWhere('booking.end_time > :start', { start: firstSlotStartUtc })
      .getMany();

    const formattedSlots = rawSlots.map((slot) => {
      // Check if slot overlaps with any booking
      // Overlap formula: slotStart < bookingEnd && slotEnd > bookingStart
      const isTaken = existingBookings.some(
        (booking) =>
          new Date(slot.startUtc) < new Date(booking.endTime) &&
          new Date(slot.endUtc) > new Date(booking.startTime)
      );

      return {
        start: slot.startUtc,
        end: slot.endUtc,
        displayStart: slot.startLocal,
        displayEnd: slot.endLocal,
        available: !isTaken,
      };
    });

    return {
      resource: {
        id: resource.id,
        name: resource.name,
        timezone: resource.timezone,
      },
      date: dateString,
      displayTimezone,
      slots: formattedSlots,
    };
  }

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
