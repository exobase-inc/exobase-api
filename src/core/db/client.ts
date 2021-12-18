import _ from 'radash'
import Mongo, { ObjectId } from 'mongodb'
import * as t from '../types'
import * as mappers from './mappers'


type ErrorFirstPromise<T> = Promise<[null, T] | [Error, null]>

const removeIdPrefix = (str: string) => {
  return str.replace(/exo\..+?\./, '')
}

type Collection = 'platforms'
  | 'membership'
  | 'users'
  | 'deployments'

const objectifyListById = <T extends { id: string }>(array: T[]): Record<string, T> => {
  return array.reduce((acc, t) => ({
    ...acc,
    [removeIdPrefix(t.id)]: t
  }), {} as Record<string, T>)
}

const addItem = <TDocument extends t.MongoDocument, TModel>({
  getDb,
  collection,
  toDocument
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toDocument: (model: TModel) => TDocument
}) => async (model: TModel): ErrorFirstPromise<TModel> => {
  const record: TDocument = toDocument(model)
  const db = await getDb()
  const [err] = await _.try(() => {
    return db.collection<TDocument>(collection).insertOne(record as any)
  })()
  if (err) return [err, null]
  return [null, model]
}

const findItem = <TModel, TArgs, TDocument>({
  getDb,
  collection,
  toQuery,
  toModel
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toQuery: (args: TArgs) => Mongo.Filter<TDocument>,
  toModel: (record: TDocument) => TModel
}) => async (args: TArgs): ErrorFirstPromise<TModel> => {
  const db = await getDb()
  const query = toQuery(args)
  const [err, record] = await _.try(() => {
    return db.collection<TDocument>(collection).findOne(query) as Promise<TDocument>
  })()
  if (err) return [err, null]
  return [null, toModel(record)]
}

const findManyItems = <TModel, TArgs, TDocument>({
  getDb,
  collection,
  toQuery,
  toModel
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toQuery: (args: TArgs) => any,
  toModel: (record: TDocument) => TModel
}) => async (args: TArgs): ErrorFirstPromise<TModel[]> => {
  const db = await getDb()
  const cursor = db.collection<TDocument>(collection).find(toQuery(args))
  const [err2, records] = await _.try(() => cursor.toArray() as Promise<TDocument[]>)()
  if (err2) return [err2, null]
  return [null, records.map(toModel)]
}

const updateOne = <TDocument extends t.MongoDocument, TPatch>({
  getDb,
  collection,
  toQuery,
  toUpdate
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toQuery: (patch: TPatch) => Mongo.Filter<TDocument>
  toUpdate: (patch: TPatch) => Partial<TDocument> | Mongo.UpdateFilter<TDocument>
}) => async (patch: TPatch): ErrorFirstPromise<void> => {
  const db = await getDb()
  const [err] = await _.try(() => {
    return db.collection<TDocument>(collection).updateOne(toQuery(patch), toUpdate(patch), {})
  })()
  if (err) return [err, null]
  return [null, null]
}

const createMongoClient = (client: Mongo.MongoClient) => {
  const dbPromise = client.connect().then(c => c.db('main'))
  const getDb = async () => dbPromise

  return {
    //
    // USER
    //
    addUser: addItem({
      getDb,
      collection: 'users',
      toDocument: (user: t.User): t.UserDocument => ({
        ...user,
        _id: new ObjectId(removeIdPrefix(user.id))
      })
    }),
    findUserByEmail: findItem({
      getDb,
      collection: 'users',
      toQuery: (args: { email: string }) => ({ email: args.email }),
      toModel: mappers.User.fromUserRecord
    }),

    //
    // PLATFORM
    //
    addPlatform: addItem({
      getDb,
      collection: 'platforms',
      toDocument: (platform: t.Platform): t.PlatformDocument => ({
        ...platform,
        _id: new ObjectId(removeIdPrefix(platform.id)),
        services: objectifyListById(platform.services.map(s => ({
          ...s,
          instances: objectifyListById(s.instances)
        })))
      })
    }),
    findPlatformById: findItem({
      getDb,
      collection: 'platforms',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.Platform.fromPlatformDocument
    }),
    batchFindPlatforms: findManyItems({
      getDb,
      collection: 'platforms',
      toQuery: (args: { platformIds: string[] }) => ({
        _id: {
          $in: args.platformIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.Platform.fromPlatformDocument
    }),
    updatePlatformConfig: updateOne<t.PlatformDocument, {
      id: string
      provider: t.CloudProvider
      config: t.AWSProviderConfig | t.VercelProviderConfig | t.GCPProviderConfig
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ provider, config }) => ({
        $set: {
          [`providers.${provider}`]: _.shake(config)
        }
      })
    }),
    updateServiceInstanceAttributes: updateOne<t.PlatformDocument, {
      platformId: string
      serviceId: string
      instanceId: string
      attributes: Record<string, string | number>
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ platformId }) => ({
        _id: new ObjectId(removeIdPrefix(platformId))
      }),
      toUpdate: ({ serviceId, instanceId, attributes }) => ({
        $set: {
          [`services.${removeIdPrefix(serviceId)}.instances.${removeIdPrefix(instanceId)}.attributes`]: attributes
        }
      })
    }),
    updateInstanceLatestDeploymentId: updateOne<t.PlatformDocument, {
      platformId: string
      serviceId: string
      instanceId: string
      latestDeploymentId: string
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ platformId }) => ({
        _id: new ObjectId(removeIdPrefix(platformId))
      }),
      toUpdate: ({ serviceId, instanceId, latestDeploymentId }) => ({
        $set: {
          [`services.${removeIdPrefix(serviceId)}.instances.${removeIdPrefix(instanceId)}.latestDeploymentId`]: latestDeploymentId
        }
      })
    }),
    addServiceToPlatform: updateOne<t.PlatformDocument, {
      service: t.Service
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ service }) => ({
        _id: new ObjectId(removeIdPrefix(service.platformId))
      }),
      toUpdate: ({ service }) => ({
        $set: {
          [`services.${removeIdPrefix(service.id)}`]: {
            ...service,
            instances: objectifyListById(service.instances ?? [])
          }
        }
      })
    }),

    //
    // SERVICE
    //
    // addService: addItem({
    //   getDb,
    //   collection: 'services',
    //   toDocument: (service: t.Service): t.ServiceDocument => ({
    //     ...service,
    //     _id: new ObjectId(removeIdPrefix(service.id)),
    //     _platformId: new ObjectId(removeIdPrefix(service.platformId))
    //   })
    // }),
    // findServiceById: findItem({
    //   getDb,
    //   collection: 'services',
    //   toQuery: ({ id }: { id: string }) => ({
    //     _id: new ObjectId(removeIdPrefix(id))
    //   }),
    //   toModel: mappers.Service.fromServiceDocument
    // }),
    // findServicesForEnvironment: findManyItems({
    //   getDb,
    //   collection: 'services',
    //   toQuery: (args: {
    //     platformId: string
    //     environmentId: string
    //   }) => ({
    //     _platformId: new ObjectId(removeIdPrefix(args.platformId)),
    //     _environmentId: new ObjectId(removeIdPrefix(args.environmentId))
    //   }),
    //   toModel: mappers.Service.fromServiceDocument
    // }),
    // updateServiceAttributes: updateOne<t.ServiceDocument, {
    //   id: string
    //   attributes: Record<string, string | number>
    // }>({
    //   getDb,
    //   collection: 'services',
    //   toQuery: ({ id }) => ({
    //     _id: new ObjectId(removeIdPrefix(id))
    //   }),
    //   toUpdate: ({ attributes }) => ({
    //     $set: {
    //       attributes
    //     }
    //   })
    // }),

    //
    //  DEPLOYMENT
    //
    addDeployment: addItem({
      getDb,
      collection: 'deployments',
      toDocument: (deployment: t.Deployment): t.DeploymentDocument => ({
        ...deployment,
        _id: new ObjectId(removeIdPrefix(deployment.id)),
        _platformId: new ObjectId(removeIdPrefix(deployment.platformId)),
        _serviceId: new ObjectId(removeIdPrefix(deployment.serviceId)),
        _environmentId: new ObjectId(removeIdPrefix(deployment.environmentId)),
        _instanceId: new ObjectId(removeIdPrefix(deployment.instanceId))
      })
    }),
    findDeploymentById: findItem({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.Deployment.fromDeploymentDocument
    }),
    batchFindDeployments: findManyItems({
      getDb,
      collection: 'deployments',
      toQuery: (args: { deploymentIds: string[] }) => ({
        _id: {
          $in: args.deploymentIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.Deployment.fromDeploymentDocument
    }),
    appendDeploymentLedger: updateOne<t.DeploymentDocument, {
      id: string
      status: t.DeploymentStatus
      timestamp: number
      source: string
    }>({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ status, timestamp, source }) => ({
        $push: {
          ledger: {
            status, timestamp, source
          }
        }
      })
    }),
    appendDeploymentLogs: updateOne<t.DeploymentDocument, {
      id: string
      logs: string
    }>({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ logs }) => ([{
        $set: { logs: { $concat: [ "$logs", logs ] } } 
      }])
    }),


    //
    // MEMBERSHIP
    //
    addMembership: addItem({
      getDb,
      collection: 'membership',
      toDocument: (membership: t.Membership): t.MembershipDocument => ({
        ...membership,
        _id: new ObjectId(removeIdPrefix(membership.id)),
        _userId: new ObjectId(removeIdPrefix(membership.userId)),
        _platformId: new ObjectId(removeIdPrefix(membership.platformId)),
        _environmentId: new ObjectId(removeIdPrefix(membership.environmentId))
      })
    }),
    lookupUserMembership: findManyItems({
      getDb,
      collection: 'membership',
      toQuery: (args: { userId: string }) => ({
        _userId: new ObjectId(removeIdPrefix(args.userId))
      }),
      toModel: mappers.Membership.fromMembershipDocument
    })
  }
}

export default createMongoClient
export type MongoClient = ReturnType<typeof createMongoClient>
