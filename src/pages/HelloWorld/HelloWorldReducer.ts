import { Action } from 'redux';

import { HelloWorldState, helloWorldState } from './HelloWorldState';

export function helloWorldReducer(state: HelloWorldState = helloWorldState, action: Action): HelloWorldState {
  switch (action.type) {
    case 'increase':
      return {
        count: state.count + 1
      };
    case 'decrease':
      return {
        count: state.count - 1
      };
    default:
      return state;
  }
}