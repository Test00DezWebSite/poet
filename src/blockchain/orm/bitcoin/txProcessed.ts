import { Column, PrimaryColumn, PrimaryGeneratedColumn, Table } from 'typeorm';
import { Index } from 'typeorm/decorator/Index';

@Table()
export default class TxProcessed {

  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false })
  hash: string

  @Column({ nullable: true })
  height: number

  @Column({ nullable: true })
  poetTransactions: number

  @Column({ nullable: true })
  blockHash: string

  @Column({ nullable: true })
  timeProcessed: number

  @Column({ nullable: true })
  errorMessage: string
}
