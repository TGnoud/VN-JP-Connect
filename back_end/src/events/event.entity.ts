import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { EventParticipant } from '../event-participants/event-participant.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  organizer_id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'datetime' })
  event_date: Date;

  @Column({ length: 255 })
  location: string;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @OneToMany(() => EventParticipant, (ep) => ep.event)
  participants: EventParticipant[];
}
