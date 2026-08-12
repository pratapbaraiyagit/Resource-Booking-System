import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from '../resources/resource.entity';

@Entity()
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  resourceId: string;

  @ManyToOne(() => Resource, (resource) => resource.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  @Column('int')
  dayOfWeek: number;

  @Column('time')
  startTime: string; // e.g. "09:00:00"

  @Column('time')
  endTime: string; // e.g. "17:00:00"
}
