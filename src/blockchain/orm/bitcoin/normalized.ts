import { Column, PrimaryColumn, PrimaryGeneratedColumn, Table } from 'typeorm';
import { Index } from 'typeorm/decorator/Index';

@Table()
export default class Normalized {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false })
  txId: string

  @Column({ nullable: false })
  @Index()
  ntxId: string

  @Column({ nullable: true })
  confirmed: boolean
}
