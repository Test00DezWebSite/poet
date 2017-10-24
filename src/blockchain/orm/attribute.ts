import { Table, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import Claim from './claim'

@Table()
export default class Attribute {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(type => Claim, claim => claim.attributes)
  claim: Claim

  @Column()
  key: string

  @Column('text')
  value: string
}
