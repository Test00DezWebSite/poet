import { Table, PrimaryColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm'
import Profile from './profile'
import Work from './work'

@Table()
export default class Title {

  @PrimaryColumn()
  id: string

  @OneToOne(type => Work, work => work.title)
  @JoinColumn()
  reference: Work

  @ManyToOne(type => Profile, profile => profile.ownedWorks)
  owner: Profile

  attributes: { [key: string]: string }
}
