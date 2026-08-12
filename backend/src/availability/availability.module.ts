import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { Availability } from './availability.entity';
import { Resource } from '../resources/resource.entity';
import { Booking } from '../bookings/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Availability, Resource, Booking])],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
