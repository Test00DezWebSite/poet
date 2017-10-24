import { ClaimTypes } from 'poet-js'

import work from "./work"
import profile from "./profile"
import title from "./title"
import offering from "./offering"
import license from "./license"
import { HookDescription } from "../hook"

export const CertificationRules: {
  readonly [key in ClaimTypes.ClaimType]: ReadonlyArray<HookDescription>
} = {
  'Work'        : [work],
  'Title'       : [title],
  'License'     : [license],
  'Offering'    : [offering],
  'Profile'     : [profile],
  'Certificate' : [],
  'Revocation'  : [],
}
