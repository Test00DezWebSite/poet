import { Table, Column, PrimaryGeneratedColumn } from 'typeorm'

@Table()
export default class ClaimLink {
  @PrimaryGeneratedColumn()
  id: string

  @Column()
  from: string

  @Column()
  to: string
}
