import _ from 'radash'
import * as crypto from 'crypto'


export const createId = (model: 'service' | 'platform' | 'user' | 'deployment' | 'membership' | 'domain') => {
  const rand = crypto.randomBytes(12).toString('hex')
  return `exo.${model}.${rand}`
}

export default {
  createId
}