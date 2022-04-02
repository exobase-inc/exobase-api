/**
 * We do not do migrations in the common sense. Instead, we
 * version database documents and write mapping functions to
 * migrate a single document from one version to the next.
 */
import _ from 'radash'
import type { Collection } from '../collections'
import * as t from '../types'

import gotoPlatformV2 from './platforms/migrate.v2'

/**
 * The current document version being written to the
 * database. Any documents pulled with an older version
 * will be migrated to the current version, updated in
 * the database, and then returned by the db client.
 */
type Version = 1 | 2
export const CURRENT_VERSIONS: Record<Collection, Version> = {
  platforms: 2,
  users: 1,
  repository_lookup: 1,
  deployments: 1,
  membership: 1
}

const MIGRATIONS: Record<Collection, Record<number, (document: t.MongoDocument) => t.MongoDocument>> = {
  platforms: {
    1: gotoPlatformV2
  },
  users: {},
  repository_lookup: {},
  deployments: {},
  membership: {}
}

export const update = (collection: Collection, document: t.MongoDocument) => {
  // If document version is same as the current version then
  // the document is fully up to date. Return null instructing
  // a noop
  if (document._version === CURRENT_VERSIONS[collection]) {
    return null
  }

  // If there is no migration func for the given collection and
  // document version then just return null instructing a noop
  const migrate = MIGRATIONS[collection][document._version ?? 1]
  if (!migrate) {
    return null
  }

  // Using recursion here (hoping I don't regret it) to run all
  // migrations if there are many. Our migration funcs should
  // only migrate single versions (from vX -> vX+1). If a document
  // is further than 1 version behind this will run all migrations
  // on it in order until its up to date and then return it.
  const migrated = migrate(document)

  if (!!migrated._version && migrated._version < CURRENT_VERSIONS[collection]) {
    return update(collection, migrated)
  }

  return migrated
}

export default update
