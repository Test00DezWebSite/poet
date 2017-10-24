import {Table, Column, PrimaryGeneratedColumn, Index} from 'typeorm'

@Table()
export default class Device {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    @Index()
    registrationId: string

    @Column()
    deviceId: string

    @Column()
    deviceName: string

    @Column()
    platform: string

    @Column()
    @Index()
    publicKey: string
}