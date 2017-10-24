import { Table, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import NotificationRead from './notification';

export enum EventType {
  WORK_CREATED,
  PROFILE_CREATED,
  TITLE_ASSIGNED,
  TITLE_REVOKED,
  LICENSE_OFFERED,
  LICENSE_BOUGHT,
  LICENSE_SOLD,
  SELF_LICENSE,
  WORK_MODIFIED,
  WORK_TRANSFERRED,
  BLOCKCHAIN_STAMP,
}

@Table()
export default class Event {

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  type: EventType

  @Column()
  timestamp: number

  @Column({ nullable: true })
  claimReference: string

  @Column({ nullable: true })
  workId?: string

  @Column({ nullable: true })
  workDisplayName?: string

  @Column({ nullable: true })
  actorId?: string

  @Column({ nullable: true })
  actorDisplayName?: string

  @Column({ nullable: true })
  payload: string

  @OneToOne(type => NotificationRead)
  @JoinColumn()
  read: NotificationRead
}
