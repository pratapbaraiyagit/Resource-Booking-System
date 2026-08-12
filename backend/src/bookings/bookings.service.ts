import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInMinutes, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Booking } from './booking.entity';
import { Resource } from '../resources/resource.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    const startUtc = parseISO(dto.startTime);
    const endUtc = parseISO(dto.endTime);

    // 1. Validate exactly 30 minutes duration
    if (startUtc >= endUtc) {
      throw new BadRequestException('startTime must be before endTime');
    }
    
    if (differenceInMinutes(endUtc, startUtc) !== 30) {
      throw new BadRequestException('Booking duration must be exactly 30 minutes');
    }

    // 2. Verify Resource exists
    const resource = await this.resourceRepository.findOne({
      where: { id: dto.resourceId },
      relations: ['availabilities'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // 3. Verify requested booking is within recurring availability rules
    const dateStringLocal = formatInTimeZone(startUtc, resource.timezone, 'yyyy-MM-dd');
    
    // Generate valid slots for this specific date
    const validSlots = this.availabilityService.generateSlots(
      dateStringLocal,
      resource.timezone,
      'UTC', // display tz doesn't matter here
      resource.availabilities,
    );

    const startUtcTime = startUtc.getTime();
    const endUtcTime = endUtc.getTime();

    const isValidSlot = validSlots.some(
      (slot) => parseISO(slot.startUtc).getTime() === startUtcTime && parseISO(slot.endUtc).getTime() === endUtcTime
    );

    if (!isValidSlot) {
      throw new BadRequestException('Booking time is outside of valid resource availability');
    }

    // 4. Save to DB natively, relying completely on PG exclusion constraint for concurrency
    const newBooking = this.bookingRepository.create({
      resourceId: dto.resourceId,
      userId: dto.userId,
      startTime: startUtc,
      endTime: endUtc,
    });

    try {
      return await this.bookingRepository.save(newBooking);
    } catch (error: any) {
      // 23P04 is the PostgreSQL error code for exclusion_violation
      if (error.code === '23P04' || error.message?.includes('no_overlapping_bookings')) {
        throw new ConflictException('This slot has already been booked.');
      }
      
      // Let any other database errors bubble up
      throw error;
    }
  }
}
