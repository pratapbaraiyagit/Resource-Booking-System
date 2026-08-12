import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from '../resources/resource.entity';

@Entity('availability')
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'resource_id' })
  resourceId: string;

  @ManyToOne(() => Resource, (resource) => resource.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column('int', { name: 'day_of_week' })
  dayOfWeek: number;

  @Column('time', { name: 'start_local_time' })
  startLocalTime: string;

  @Column('time', { name: 'end_local_time' })
  endLocalTime: string;
}
