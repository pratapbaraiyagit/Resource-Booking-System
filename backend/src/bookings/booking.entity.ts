import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Exclusion } from 'typeorm';
import { Resource } from '../resources/resource.entity';

@Entity()
@Exclusion(`no_overlapping_bookings`, `USING gist ("resourceId" WITH =, tstzrange("startTime", "endTime") WITH &&)`)
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  resourceId: string;

  @ManyToOne(() => Resource, (resource) => resource.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @Column('varchar')
  userId: string;

  @Column('timestamptz')
  startTime: Date;

  @Column('timestamptz')
  endTime: Date;

  @Column({ type: 'enum', enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' })
  status: string;
}
