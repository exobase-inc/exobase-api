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
  const uri = `mongodb+srv://${username}:${password}@${instance}.${subdomain}.mongodb.net/main?retryWrites=true&w=majority`
  const client = new Mongo(uri, { 
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1 
  })
  return createClient(client)
}

export default makeMongo