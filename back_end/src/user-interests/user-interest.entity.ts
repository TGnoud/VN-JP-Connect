import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Tag } from '../tags/tag.entity';

@Entity('user_interests')
export class UserInterest {
  @PrimaryColumn({ type: 'bigint' })
  user_id: string;

  @PrimaryColumn({ type: 'int' })
  tag_id: number;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Tag, (t) => t.userInterests)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
