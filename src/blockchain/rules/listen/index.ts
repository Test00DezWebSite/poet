import { ClaimTypes } from 'poet-js'

import { HookDescription } from '../hook'

import { CertificateRule } from './certificate'
import { RevocationRule } from './revocation'
import { LicenseRule } from './license'
import { OfferingRule } from './offering'
import { TitleRule } from './title'
import { WorkRule } from './work'

export const ListenRules: {
  readonly [key in ClaimTypes.ClaimType]: ReadonlyArray<HookDescription>
} = {
  'Work'        : [WorkRule],
  'Title'       : [TitleRule],
  'License'     : [LicenseRule],
  'Offering'    : [OfferingRule],
  'Profile'     : [],
  'Certificate' : [CertificateRule],
  'Revocation'  : [RevocationRule],
}