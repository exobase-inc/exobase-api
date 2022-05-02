import * as Mongo from 'mongodb'
import { stackName } from '../../../model'
import * as t from '../../../types'
import { MongoDocument } from '../../types'
import { Migration, MigrationFunction } from '../types'

const migrate: MigrationFunction = async (
  document: MongoDocument,
  db: Mongo.Db
): Promise<MongoDocument> => {
  const service: any = document
  return {
    _id: document._id,
    _version: 1,
    id: service.id,
    name: service.name,
    tags: service.tags,
    platformId: service.platformId,
    stackName: stackName(service.buildPack.name, service.id),
    source: service.source,
    deployments: service.deployments,
    latestDeployment: service.latestDeployment,
    activeDeployment: service.activeDeployment,
    domain: service.domain,
    isDeleted: service.isDeleted,
    deleteEvent: service.deleteEvent,
    createdAt: service.createdAt,
    pack: {
      id: '???',
      name: service.buildPack.name,
      source: service.source,
      description: '???',
      type: service.type,
      provider: service.provider,
      service: service.service,
      language: service.language,
      author: {

      },
      version: service.buildPack.version
    },
    config: service.config
  } as MongoDocument
}

const migration: Migration = {
  collection: 'platforms',
  versionOut: 1,
  migrate
}

export default migration