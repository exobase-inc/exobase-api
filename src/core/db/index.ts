import { MongoClient as Mongo, ServerApiVersion } from 'mongodb'
import config from '../config'

import createClient from './client'

export { MongoClient } from './client'

const makeMongo = () => {
  const client = new Mongo(config.mongoUri, {
    serverApi: ServerApiVersion.v1
  })
  return createClient(client)
}

export default makeMongo
