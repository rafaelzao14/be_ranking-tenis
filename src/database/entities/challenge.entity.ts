import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChallengeStatus } from '../enums';
import { Match } from './match.entity';
import { Player } from './player.entity';

@Entity({ name: 'Challenge' })
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'challengerId', type: 'uuid' })
  challengerId!: string;

  @Column({ name: 'challengedId', type: 'uuid' })
  challengedId!: string;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    enumName: 'ChallengeStatus',
    default: ChallengeStatus.PENDING,
  })
  status!: ChallengeStatus;

  @Column({ name: 'expiresAt', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Player, (player) => player.challengerChallenges)
  @JoinColumn({ name: 'challengerId' })
  challenger!: Player;

  @ManyToOne(() => Player, (player) => player.challengedChallenges)
  @JoinColumn({ name: 'challengedId' })
  challenged!: Player;

  @OneToOne(() => Match, (match) => match.challenge)
  match!: Match | null;
}
