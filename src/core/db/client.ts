import _ from 'radash'
import * as Mongo from 'mongodb'
import { ObjectId } from 'mongodb'
import * as t from '../types'
import * as mappers from './mappers'


const removeIdPrefix = (str: string) => {
  return str.replace(/exo\..+?\./, '')
}

type Collection = 'platforms'
  | 'membership'
  | 'users'
  | 'deployments'
  | 'repository_lookup'

const objectifyListById = <T extends { id: string }>(array: T[]): Record<string, T> => {
  return array.reduce((acc, t) => ({
    ...acc,
    [removeIdPrefix(t.id)]: t
  }), {} as Record<string, T>)
}

const addItem = <TDocument, TModel>({
  getDb,
  collection,
  toDocument
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toDocument: (model: TModel) => TDocument
}) => async (model: TModel): Promise<[Error, TModel]> => {
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
}) => async (args: TArgs): Promise<[Error, TModel]> => {
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
  toOptions,
  toModel
}: {
  getDb: () => Promise<Mongo.Db>,
  collection: Collection,
  toQuery: (args: TArgs) => any,
  toOptions?: (args: TArgs) => Mongo.FindOptions<Mongo.Document>,
  toModel: (record: TDocument) => TModel
}) => async (args: TArgs): Promise<[Error, TModel[]]> => {
  const db = await getDb()
  const cursor = db.collection<TDocument>(collection).find(toQuery(args), toOptions?.(args))
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
}) => async (patch: TPatch): Promise<[Error, void]> => {
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
        services: objectifyListById(platform.services),
        domains: {},
        _githubInstallations: objectifyListById(platform._githubInstallations)
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
    updateServiceInPlatform: updateOne<t.PlatformDocument, {
      id: string
      service: t.Service
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ service }) => ({
        $set: {
          [`services.${removeIdPrefix(service.id)}`]: service
        }
      })
    }),
    addPlatformInstallation: updateOne<t.PlatformDocument, {
      id: string
      installationId: string
    }>({
      getDb,
      collection: 'platforms',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ installationId }) => ({
        $set: {
          [`_githubInstallations.${installationId}`]: { id: installationId }
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
          [`services.${removeIdPrefix(service.id)}`]: service
        }
      })
    }),
    addDomainToPlatform: updateOne<t.PlatformDocument, t.Domain>({
      getDb,
      collection: 'platforms',
      toQuery: (domain) => ({
        _id: new ObjectId(removeIdPrefix(domain.platformId))
      }),
      toUpdate: (domain) => ({
        $set: {
          [`domains.${removeIdPrefix(domain.id)}`]: domain
        }
      })
    }),
    updateServiceLatestDeploymentId: updateOne<t.PlatformDocument, t.Deployment>({
      getDb,
      collection: 'platforms',
      toQuery: (deployment) => ({
        _id: new ObjectId(removeIdPrefix(deployment.platformId))
      }),
      toUpdate: (deployment) => ({
        $set: {
          [`services.${removeIdPrefix(deployment.serviceId)}.latestDeploymentId`]: deployment.id
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
        _serviceId: new ObjectId(removeIdPrefix(deployment.serviceId))
      })
    }),
    addDomainDeployment: addItem({
      getDb,
      collection: 'deployments',
      toDocument: (deployment: t.DomainDeployment): t.DomainDeploymentDocument => ({
        ...deployment,
        _id: new ObjectId(removeIdPrefix(deployment.id)),
        _platformId: new ObjectId(removeIdPrefix(deployment.platformId)),
        _domainId: new ObjectId(removeIdPrefix(deployment.domainId))
      })
    }),
    listDeploymentsForService: findManyItems({
      getDb,
      collection: 'deployments',
      toOptions: () => ({
        limit: 20,
        sort: {
          timestamp: -1
        }
      }),
      toQuery: (args: { platformId: string, serviceId: string }) => ({
        _platformId: new ObjectId(removeIdPrefix(args.platformId)),
        _serviceId: new ObjectId(removeIdPrefix(args.serviceId))
      }),
      toModel: mappers.Deployment.fromDeploymentDocument
    }),
    findDeploymentById: findItem({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.Deployment.fromDeploymentDocument
    }),
    findDomainDeploymentById: findItem({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.DomainDeployment.fromDomainDeploymentDocument
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
    batchFindDomainDeployments: findManyItems({
      getDb,
      collection: 'deployments',
      toQuery: (args: { deploymentIds: string[] }) => ({
        _id: {
          $in: args.deploymentIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.DomainDeployment.fromDomainDeploymentDocument
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
    setDeploymentFunctions: updateOne<t.DeploymentDocument, {
      id: string
      functions: t.ExobaseFunction[]
    }>({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ functions }) => ({
        $set: {
          functions
        }
      })
    }),
    setDeploymentAttributes: updateOne<t.DeploymentDocument, {
      id: string
      attributes: t.DeploymentAttributes
    }>({
      getDb,
      collection: 'deployments',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ attributes }) => ({
        $set: {
          attributes
        }
      })
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
      })
    }),
    lookupUserMembership: findManyItems({
      getDb,
      collection: 'membership',
      toQuery: (args: { userId: string }) => ({
        _userId: new ObjectId(removeIdPrefix(args.userId))
      }),
      toModel: mappers.Membership.fromMembershipDocument
    }),

  
    //
    //  REPOSITORY / SERVICE LOOKUP
    //
    addRepositoryLookupItem: addItem({
      getDb,
      collection: 'repository_lookup',
      toDocument: (item: t.RepositoryServiceLookupItem): t.RepositoryServiceLookupItemDocument => ({
        ...item,
        _serviceId: new ObjectId(removeIdPrefix(item.serviceId)),
        _platformId: new ObjectId(removeIdPrefix(item.platformId)),
      })
    }),
    lookupRepositoryServiceItems: findManyItems({
      getDb,
      collection: 'repository_lookup',
      toQuery: (args: { repositoryId: string }) => ({
        repositoryId: new ObjectId(removeIdPrefix(args.repositoryId))
      }),
      toModel: mappers.RepositoryServiceLookupItem.fromDocument
    }),
  }
}

export default createMongoClient
export type MongoClient = ReturnType<typeof createMongoClient>
