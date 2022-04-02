import _ from 'radash'
import type { Props, ApiFunction } from '@exobase/core'
import { MongoClient } from '../db'

export async function withMongoConnection(func: ApiFunction, props: Props<any, { mongo: MongoClient }>) {
  // const client = props.services.mongo.client
  const [err, response] = await _.try(func)(props)
  // await mongo.close()
  if (err) {
    throw err
  }
  return response
}

export const useMongoConnection = () => (func: ApiFunction) => {
  return _.partial(withMongoConnection, func)
}
