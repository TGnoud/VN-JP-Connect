import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';

@Entity('event_participants')
export class EventParticipant {
  @PrimaryColumn({ type: 'bigint' })
  event_id: number;

  @PrimaryColumn({ type: 'bigint' })
  user_id: number;

  @CreateDateColumn({ name: 'joined_at' })
  joined_at: Date;

  // Relations
  @ManyToOne(() => Event, (e) => e.participants)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
