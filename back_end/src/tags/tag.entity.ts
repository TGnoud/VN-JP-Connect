import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserInterest } from '../user-interests/user-interest.entity';

export enum TagType {
  INTEREST = 'interest',
  PURPOSE = 'purpose',
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'enum', enum: TagType })
  type: TagType;

  // Relations
  @OneToMany(() => UserInterest, (ui) => ui.tag)
  userInterests: UserInterest[];
}
