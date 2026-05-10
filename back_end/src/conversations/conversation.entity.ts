import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Match } from '../matches/match.entity';
import { Message } from '../messages/message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  match_id: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @OneToOne(() => Match, (m) => m.conversation)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];
}
