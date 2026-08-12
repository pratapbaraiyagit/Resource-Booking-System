import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Availability } from '../availability/availability.entity';
import { Booking } from '../bookings/booking.entity';

@Entity('resource')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  timezone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Availability, (availability) => availability.resource)
  availabilities: Availability[];

  @OneToMany(() => Booking, (booking) => booking.resource)
  bookings: Booking[];
}
