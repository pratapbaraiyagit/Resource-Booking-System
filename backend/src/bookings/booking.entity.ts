import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Exclusion, CreateDateColumn } from 'typeorm';
import { Resource } from '../resources/resource.entity';

@Entity('booking')
@Exclusion(`no_overlapping_bookings`, `USING gist (resource_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&)`)
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'resource_id' })
  resourceId: string;

  @ManyToOne(() => Resource, (resource) => resource.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column('varchar', { name: 'user_id' })
  userId: string;

  @Column('timestamptz', { name: 'start_time' })
  startTime: Date;

  @Column('timestamptz', { name: 'end_time' })
  endTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'enum', enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' })
  status: string;
}
