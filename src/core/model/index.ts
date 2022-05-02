import _ from 'radash'
import * as crypto from 'crypto'


export const createId = (model: 'service' | 'platform' | 'user' | 'deployment' | 'membership' | 'domain' | 'migration' | 'pack') => {
  const rand = crypto.randomBytes(12).toString('hex')
  return `exo.${model}.${rand}`
}

export const username = (email: string) => {
  return email.replace(/@.+/, '')
}

export const stackName = (buildPackName: string, serviceId: string) => {
  return `${buildPackName}-${serviceId}`.replace(/[\.\-\s]/g, '_')
}

export default {
  username,
  createId,
  stackName
}