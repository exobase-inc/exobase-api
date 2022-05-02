import _ from 'radash'
import { Collection } from '../collections'
import { MongoDocument } from '../types'
import { Migration } from './types'
import * as Mongo from 'mongodb'

// Import migration functions and 
// add to migrations list
import platforms_serviceBuildPack from './platforms/1-service-build-packs'
const ALL_MIGRATIONS: Migration[] = [
  platforms_serviceBuildPack
]

const ensureMigrated = async <T extends MongoDocument>(
  db: Mongo.Db,
  collection: Collection,
  documents: T[]
): Promise<T[]> => {

  // Find the migrations that relate to this collection
  const migrations = ALL_MIGRATIONS.filter(m => m.collection === collection)
  if (!migrations) {
    return documents
  }

  // Filter the documents for any that have a version number
  // less than the latest migration to find the documents that
  // are out of date and need to have the migrations run.
  const latestVersion = _.max(migrations, m => m.versionOut).versionOut
  const needingMigration = documents.filter(r => {
    if (r._version < latestVersion) return true
    else return false
  })
  if (needingMigration.length === 0) {
    return documents
  }
  
  // Run migrations to generate updated documents. Some kind of nasty
  // async mapping and reducing happening here. We have to run all the
  // async migration functions in order on all the documents that need
  // to be migrated.
  const ordered = _.sort(migrations, m => m.versionOut)
  const migrated = await _.map(needingMigration, (document) => {
    return _.reduce(ordered, (acc, d) => {
      return d.migrate(acc, db)
    }, document as MongoDocument)
  })

  // Run a batch update for all documents that had
  // a migration run
  const batch = db.collection(collection).initializeUnorderedBulkOp()
  for (const record of migrated) {
    batch.find({ _id: record._id }).replaceOne(record)
  }
  await batch.execute()

  // Rejoin migrated documents with documents
  // that didn't need to be migrated
  return _.zip(documents, migrated, (x) => x._id)
}

export default {
  ensureMigrated
}