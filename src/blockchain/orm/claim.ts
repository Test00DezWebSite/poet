import { Table, Column, PrimaryColumn, OneToMany, JoinTable } from 'typeorm'
import { ClaimTypes } from 'poet-js'

import Attribute from './attribute'

@Table()
export default class Claim {
  @PrimaryColumn()
  id: string

  @Column()
  publicKey: string

  @Column()
  signature: string

  @Column()
  type: ClaimTypes.ClaimType

  @OneToMany((type => Attribute), attribute => attribute.claim, {
    cascadeInsert: true,
    cascadeUpdate: true
  })
  @JoinTable()
  attributes: Attribute[]
}
