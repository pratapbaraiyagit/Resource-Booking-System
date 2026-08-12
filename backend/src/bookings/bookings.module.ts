import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './booking.entity';
import { Resource } from '../resources/resource.entity';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Resource]), AvailabilityModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
