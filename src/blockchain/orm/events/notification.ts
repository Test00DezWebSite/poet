import { Table, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinTable, JoinColumn } from 'typeorm';
import Event from './events';

@Table()
export default class Notification {

  @PrimaryGeneratedColumn()
  id: string

  @ManyToOne(type => Event)
  @JoinColumn()
  event: Event

  @Column()
  user: string

  @Column()
  read: Boolean
}
