import { Table, Column, PrimaryGeneratedColumn } from 'typeorm'

@Table()
export default class ClaimInfo {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  hash: string

  @Column()
  torrentHash: string

  @Column({ nullable: true })
  timestamp?: number

  @Column({ nullable: true })
  bitcoinHeight?: number

  @Column({ nullable: true })
  bitcoinHash?: string

  @Column({ nullable: true })
  blockHeight?: number

  @Column({ nullable: true })
  blockHash?: string

  @Column({ nullable: true })
  transactionOrder?: string

  @Column({ nullable: true })
  transactionHash: string

  @Column({ nullable: true })
  outputIndex: number

  @Column({ nullable: true })
  claimOrder?: number
}
