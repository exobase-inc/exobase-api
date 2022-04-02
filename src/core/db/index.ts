import { MongoClient as Mongo, ServerApiVersion } from 'mongodb'
import config from '../config'

import createClient from './client'
export { MongoClient } from './client'


const makeMongo = () => {
  const {
    mongoUsername: username,
    mongoPassword: password,
    mongoInstanceName: instance,
    mongoSubdomain: subdomain
  } = config
  const uri = `mongodb+srv://${username}:${password}@${instance}.${subdomain}.mongodb.net/main`
  const client = new Mongo(uri, { 
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1 ,
    maxIdleTimeMS: 50000000,
    connectTimeoutMS: 50000000,
    keepAlive: true,
    retryWrites: true,
    w: 'majority'
  })
  return createClient(client)
}

export default makeMongo