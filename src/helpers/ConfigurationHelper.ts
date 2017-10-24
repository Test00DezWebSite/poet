import { assert } from 'poet-js'

export function validatePoetVersion(poetVersion: any) {
  assert(Array.isArray(poetVersion), 'Field poetVersion must be an Array')
  assert(poetVersion.length == 4, 'Field poetVersion must have 4 elements')
  poetVersion.forEach((element: any) => assert(Number.isInteger(element) && 0 <= element && element < 256, 'Each member of poetVersion must be a number between 0 and 255'));
}

export function validatePoetNetwork(poetNetwork: any) {
 assert(poetNetwork === 'BARD' || poetNetwork === 'POET', 'Field poetVersion must be equal to BARD or POET')
}