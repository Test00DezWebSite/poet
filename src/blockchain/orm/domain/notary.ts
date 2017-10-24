import {Table, PrimaryColumn, Column} from "typeorm";

@Table()
export default class Notary {

  @PrimaryColumn()
  publicKey: string

  @Column()
  trusted: boolean
}
