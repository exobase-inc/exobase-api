import _ from 'radash'
import crypto from 'crypto'


export const createId = (model: 'service' | 'platform' | 'user' | 'environment' | 'instance' | 'deployment' | 'membership') => {
  const rand = crypto.randomBytes(12).toString('hex')
  return `exo.${model}.${rand}`
}

export default {
  createId
}