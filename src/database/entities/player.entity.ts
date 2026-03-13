import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge } from './challenge.entity';
import { Match } from './match.entity';
import { RankHistory } from './rank-history.entity';

@Entity({ name: 'Player' })
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ name: 'birthDate', type: 'timestamp', nullable: true })
  birthDate!: Date | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'boolean', default: true })
  participates!: boolean;

  @Column({ name: 'currentRank', type: 'int', nullable: true, unique: true })
  currentRank!: number | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => Challenge, (challenge) => challenge.challenger)
  challengerChallenges!: Challenge[];

  @OneToMany(() => Challenge, (challenge) => challenge.challenged)
  challengedChallenges!: Challenge[];

  @OneToMany(() => Match, (match) => match.player1)
  matchesP1!: Match[];

  @OneToMany(() => Match, (match) => match.player2)
  matchesP2!: Match[];

  @OneToMany(() => Match, (match) => match.winner)
  wins!: Match[];

  @OneToMany(() => RankHistory, (rankHistory) => rankHistory.player)
  rankHistory!: RankHistory[];
}
