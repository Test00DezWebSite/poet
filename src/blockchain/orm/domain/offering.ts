import { Column, ManyToOne, Table, PrimaryColumn, OneToMany } from 'typeorm'
import Work from './work'
import License from './license'

@Table()
export default class Offering {

  @PrimaryColumn()
  id: string

  @ManyToOne(type => Work, work => work.offerings)
  reference: Work

  @Column({ nullable: true })
  owner: string

  @OneToMany(type => License, license => license.referenceOffering)
  licenses: License[]

  @Column({ nullable: true })
  offeringType: string

  @Column({ nullable: true })
  offeringInfo: string

  attributes: { [key: string]: string }
}
