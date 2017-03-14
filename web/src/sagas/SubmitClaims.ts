import { browserHistory } from 'react-router'
import { takeEvery } from 'redux-saga'
import { call, put, select } from 'redux-saga/effects'
import * as protobuf from 'protobufjs'

import { Actions } from '../actions/index'
import auth from '../auth'
import { currentPublicKey } from '../selectors/session'
import { getMockPrivateKey } from '../mockKey'
import { Claim } from '../Claim';
import { Configuration } from '../configuration';

const jsonClaims = require('../claim.json');

async function requestIdFromAuth(dataToSign: string[]) {
  return await auth.getRequestIdForMultipleSigning(dataToSign, false)
}

async function bindAuthResponse(request: any) {
  return await auth.onResponse(request.id) as any;
}

class ClaimBuilder {
  attribute: any;
  claim: any;

  constructor() {
    const root = protobuf.Root.fromJSON(jsonClaims);
    this.attribute = root.lookup('Poet.Attribute');
    this.claim = root.lookup('Poet.Claim');
  }

  getAttributes(attrs: any) {
    if (attrs instanceof Array) {
      return attrs.map(attr => {
        return this.attribute.create(attr)
      })
    } else {
      return Object.keys(attrs).map(attr => {
        return this.attribute.create({
          key: attr,
          value: attrs[attr]
        })
      })
    }
  }

  getEncodedForSigning(data: any, publicKey: string): string {
    return new Buffer(this.claim.encode(this.claim.create({
      id: new Buffer(''),
      publicKey: new Buffer(publicKey, 'hex'),
      signature: new Buffer(''),
      type: data.type,
      attributes: this.getAttributes(data.attributes)
    })).finish()).toString('hex')
  }
}

async function submitClaims(data: any) {
  return await fetch(Configuration.api.user + '/claims', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then((res: any) => res.text())
}

const builder = new ClaimBuilder();

function* signClaims(claimTemplates: any) {
  yield put({ type: Actions.Modals.SignClaims.Show });

  const publicKey = yield select(currentPublicKey);

  const serializedToSign = claimTemplates.payload.map((template: any) => {
    return builder.getEncodedForSigning(template, publicKey);
  });

  const requestId = yield call(requestIdFromAuth, serializedToSign);
  yield put({ type: Actions.Claims.IdReceived, payload: requestId.id });
  const response = yield call(bindAuthResponse, requestId);
  yield put({ type: Actions.Claims.Response, payload: response });

  const result = yield call(submitClaims, response);

  yield put({ type: Actions.Claims.SubmittedSuccess, claims: claimTemplates.payload });

  yield put({ type: Actions.Modals.SignClaims.Hide });

  browserHistory.push(`/`);
}

function* mockLoginHit(action: any) {
  yield call(fetch, Configuration.api.mockApp + '/' + getMockPrivateKey() + '/' + action.payload, { method: 'POST' })
}

function claimSubmitSaga() {
  return function*() {
    yield takeEvery(Actions.Claims.SubmitRequested, signClaims);
    yield takeEvery(Actions.Claims.FakeSign, mockLoginHit);
  }
}

export default claimSubmitSaga;
