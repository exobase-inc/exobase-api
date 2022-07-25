import * as _ from 'radash'
import * as crypto from 'crypto'
import * as t from '../types'

export const createId = <TModel extends t.Model> (model: TModel): t.Id<TModel> => {
  const rand = crypto.randomBytes(12).toString('hex')
  return `exo.${model}.${rand}`
}

export const username = (email: string) => {
  return email.replace(/@.+/, '')
}

export default {
  username,
  createId,
  id: createId
}