import {Table, PrimaryColumn, Column} from "typeorm";

@Table()
export default class Certificate {

  @PrimaryColumn()
  id: string

  @Column()
  reference: string

  @Column()
  processed: boolean

  @Column()
  revoked: boolean
}
