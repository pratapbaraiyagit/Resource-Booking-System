import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Availability } from '../availability/availability.entity';
import { Booking } from '../bookings/booking.entity';

@Entity()
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Availability, (availability) => availability.resource)
  availabilities: Availability[];

  @OneToMany(() => Booking, (booking) => booking.resource)
  bookings: Booking[];
}
