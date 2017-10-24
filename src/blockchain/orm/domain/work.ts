import { OneToMany, ManyToOne, ManyToMany, Table, JoinTable, OneToOne, PrimaryColumn, Column } from 'typeorm'
import License from './license'
import Offering from './offering'
import Profile from './profile'
import Title from './title'
import ClaimInfo from '../claimInfo'

@Table()
export default class Work {

  @PrimaryColumn()
  id: string

  @Column({ nullable: true })
  claimId?: string

  claimInfo?: ClaimInfo

  @Column({ nullable: true })
  displayName: string

  @OneToOne(type => Title, title => title.reference, { nullable: true })
  title: Title

  @ManyToOne(type => Profile, profile => profile.authoredWorks, { nullable: true })
  author: Profile

  @ManyToOne(type => Profile, profile => profile.ownedWorks, { nullable: true })
  owner: Profile

  @OneToMany(type => License, license => license.reference)
  @JoinTable()
  licenses: License[]

  @OneToMany(type => Offering, offering => offering.reference)
  @JoinTable()
  offerings: Offering[]

  @ManyToMany(type => Profile, profile => profile.hasLicensesFor)
  @JoinTable()
  publishers: Profile[]

  attributes: { [key: string]: string }
}
