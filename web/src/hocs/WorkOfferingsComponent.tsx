import { Configuration } from '../configuration';

import { HexString, Price } from '../common'
import FetchComponent, { FetchComponentProps } from './FetchComponent'

export interface WorkOfferingProps {
  id: HexString;

  price: Price;
  description: string;
  type: string;

  licenses: [{
    workId: HexString;
    publisher: string;
    url: string;
  }]

}

export interface WorkOfferingsProps extends FetchComponentProps {
  workId: HexString;

  workOfferings: WorkOfferingProps[]
}

export default FetchComponent.bind(null, (props: WorkOfferingsProps) => ({
  url: `${Configuration.api.explorer}/works/${props.workId}`
}));