import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum Nationality {
  JP = 'JP',
  VN = 'VN',
}

@Entity('users') // Tên bảng trong DB
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ length: 100 })
  full_name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 20 })
  phone_number: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ type: 'enum', enum: Nationality })
  nationality: Nationality;

  @Column({ default: false })
  is_verified: boolean;

  @CreateDateColumn()
  created_at: Date;
}