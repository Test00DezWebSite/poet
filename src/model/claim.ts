export interface Attribute {
    key: string
    value: string
}

export type CreativeWork = 'CreativeWork'
export type Title = 'Title'
export type License = 'License'
export type Offering = 'Offering'
export type Profile = 'Profile'
export type Certificate = 'Certificate'
export type Revokation = 'Revokation'

export const CREATIVE_WORK : CreativeWork = 'CreativeWork'
export const TITLE : Title = 'Title'
export const LICENSE : License = 'License'
export const OFFERING : Offering = 'Offering'
export const PROFILE : Profile = 'Profile'
export const CERTIFICATE : Certificate = 'Certificate'
export const REVOKATION : Revokation = 'Revokation'

export type ClaimType = CreativeWork | Title | License | Offering | Profile | Certificate | Revokation
export type Judgement = Certificate | Revokation

export interface Claim {
    id: string

    publicKey: string
    signature: string

    type: ClaimType
    attributes: { [key: string]: string }
}

export interface Block {
    id: string
    claims: Claim[]
}