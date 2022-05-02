import _ from 'radash'
import * as Mongo from 'mongodb'
import { ObjectId } from 'mongodb'
import * as t from '../types'
import * as mappers from './mappers'
import { addItem, findItem, findManyItems, queryAll, updateOne } from './methods'
import { CURRENT_VERSIONS } from './collections'

const removeIdPrefix = (str: string) => {
  return str.replace(/exo\..+?\./, '')
}

const oid = (id: string) => new ObjectId(removeIdPrefix(id))

const objectifyListById = <T extends { id: string }>(array: T[]): Record<string, T> => {
  return array.reduce(
    (acc, t) => ({
      ...acc,
      [removeIdPrefix(t.id)]: t
    }),
    {} as Record<string, T>
  )
}

const createMongoClient = (client: Mongo.MongoClient) => {
  const db = client.connect().then(c => c.db('main'))
  return {
    //
    // USER
    //
    addUser: addItem({
      db,
      collection: 'users',
      toDocument: (user: t.User): t.UserDocument => ({
        ...user,
        _version: CURRENT_VERSIONS.users,
        _id: new ObjectId(removeIdPrefix(user.id))
      })
    }),
    findUserId: findItem({
      db,
      collection: 'users',
      toQuery: ({ userId }: { userId: string }) => ({
        _id: new ObjectId(removeIdPrefix(userId))
      }),
      toModel: mappers.UserDocument.toModel
    }),
    findUserByEmail: findItem({
      db,
      collection: 'users',
      toQuery: ({ email }: { email: string }) => ({
        email
      }),
      toModel: mappers.UserDocument.toModel
    }),

    //
    // PLATFORM
    //
    addPlatform: addItem({
      db,
      collection: 'platforms',
      toDocument: (platform: t.Platform): t.PlatformDocument => ({
        ...platform,
        _version: CURRENT_VERSIONS.platforms,
        _id: new ObjectId(removeIdPrefix(platform.id)),
        services: objectifyListById(platform.services),
        domains: {},
        _githubInstallations: objectifyListById(platform._githubInstallations)
      })
    }),
    findPlatformById: findItem({
      db,
      collection: 'platforms',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.PlatformDocument.toModel
    }),
    findService: findItem({
      db,
      collection: 'platforms',
      toQuery: ({ platformId }: { platformId: string; serviceId: string }) => ({
        _id: new ObjectId(removeIdPrefix(platformId))
      }),
      toModel: (document: t.PlatformDocument, { serviceId }) => {
        return mappers.PlatformDocument.toModel(document).services.find(s => s.id === serviceId)
      }
    }),
    batchFindPlatforms: findManyItems({
      db,
      collection: 'platforms',
      toQuery: (args: { platformIds: string[] }) => ({
        _id: {
          $in: args.platformIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.PlatformDocument.toModel
    }),
    updatePlatformConfig: updateOne<
      t.PlatformDocument,
      {
        id: string
        provider: t.CloudProvider
        config: t.AWSProviderConfig | t.VercelProviderConfig | t.GCPProviderConfig
      }
    >({
      db,
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
    markServiceDeleted: updateOne<
      t.PlatformDocument,
      {
        platformId: string
        serviceId: string
        deleteEvent: t.DeleteEvent
      }
    >({
      db,
      collection: 'platforms',
      toQuery: ({ platformId }) => ({
        _id: new ObjectId(removeIdPrefix(platformId))
      }),
      toUpdate: ({ serviceId, deleteEvent }) => ({
        $set: {
          [`services.${removeIdPrefix(serviceId)}.isDeleted`]: true,
          [`services.${removeIdPrefix(serviceId)}.deleteEvent`]: deleteEvent
        }
      })
    }),
    updateServiceInPlatform: updateOne<
      t.PlatformDocument,
      {
        id: string
        service: t.Service
      }
    >({
      db,
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
    updateDomainInPlatform: updateOne<
      t.PlatformDocument,
      {
        id: string
        domain: t.Domain
      }
    >({
      db,
      collection: 'platforms',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ domain }) => ({
        $set: {
          [`domains.${removeIdPrefix(domain.id)}`]: domain
        }
      })
    }),
    addPlatformInstallation: updateOne<
      t.PlatformDocument,
      {
        id: string
        installationId: string
      }
    >({
      db,
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
    addServiceToPlatform: updateOne<
      t.PlatformDocument,
      {
        service: t.Service
      }
    >({
      db,
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
      db,
      collection: 'platforms',
      toQuery: domain => ({
        _id: new ObjectId(removeIdPrefix(domain.platformId))
      }),
      toUpdate: domain => ({
        $set: {
          [`domains.${removeIdPrefix(domain.id)}`]: domain
        }
      })
    }),
    updateServiceLatestDeployment: updateOne<t.PlatformDocument, t.Deployment>({
      db,
      collection: 'platforms',
      toQuery: deployment => ({
        _id: new ObjectId(removeIdPrefix(deployment.platformId))
      }),
      toUpdate: deployment => ({
        $set: {
          [`services.${removeIdPrefix(deployment.serviceId)}.latestDeployment`]: deployment
        }
      })
    }),
    updateServiceActiveDeployment: updateOne<t.PlatformDocument, t.Deployment>({
      db,
      collection: 'platforms',
      toQuery: deployment => ({
        _id: new ObjectId(removeIdPrefix(deployment.platformId))
      }),
      toUpdate: deployment => ({
        $set: {
          [`services.${removeIdPrefix(deployment.serviceId)}.activeDeployment`]: deployment
        }
      })
    }),

    //
    // SERVICE
    //
    // addService: addItem({
    //   db,
    //   collection: 'services',
    //   toDocument: (service: t.Service): t.ServiceDocument => ({
    //     ...service,
    //     _id: new ObjectId(removeIdPrefix(service.id)),
    //     _platformId: new ObjectId(removeIdPrefix(service.platformId))
    //   })
    // }),
    // findServiceById: findItem({
    //   db,
    //   collection: 'services',
    //   toQuery: ({ id }: { id: string }) => ({
    //     _id: new ObjectId(removeIdPrefix(id))
    //   }),
    //   toModel: mappers.Service.fromServiceDocument
    // }),
    // findServicesForEnvironment: findManyItems({
    //   db,
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
    //   db,
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
      db,
      collection: 'deployments',
      toDocument: (deployment: t.Deployment): t.DeploymentDocument => ({
        ...deployment,
        _version: CURRENT_VERSIONS.deployments,
        _id: new ObjectId(removeIdPrefix(deployment.id)),
        _platformId: new ObjectId(removeIdPrefix(deployment.platformId)),
        _serviceId: new ObjectId(removeIdPrefix(deployment.serviceId))
      })
    }),
    addDomainDeployment: addItem({
      db,
      collection: 'deployments',
      toDocument: (deployment: t.DomainDeployment): t.DomainDeploymentDocument => ({
        ...deployment,
        _version: CURRENT_VERSIONS.deployments,
        _id: new ObjectId(removeIdPrefix(deployment.id)),
        _platformId: new ObjectId(removeIdPrefix(deployment.platformId)),
        _domainId: new ObjectId(removeIdPrefix(deployment.domainId))
      })
    }),
    listDeploymentsForService: findManyItems({
      db,
      collection: 'deployments',
      toOptions: () => ({
        limit: 20,
        sort: {
          timestamp: -1
        }
      }),
      toQuery: (args: { platformId: string; serviceId: string }) => ({
        _platformId: new ObjectId(removeIdPrefix(args.platformId)),
        _serviceId: new ObjectId(removeIdPrefix(args.serviceId))
      }),
      toModel: mappers.DeploymentDocument.toModel
    }),
    findDeploymentById: findItem({
      db,
      collection: 'deployments',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.DeploymentDocument.toModel
    }),
    findDomainDeploymentById: findItem({
      db,
      collection: 'deployments',
      toQuery: ({ id }: { id: string }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toModel: mappers.DomainDeploymentDocument.toModel
    }),
    batchFindDeployments: findManyItems({
      db,
      collection: 'deployments',
      toQuery: (args: { deploymentIds: string[] }) => ({
        _id: {
          $in: args.deploymentIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.DeploymentDocument.toModel
    }),
    batchFindDomainDeployments: findManyItems({
      db,
      collection: 'deployments',
      toQuery: (args: { deploymentIds: string[] }) => ({
        _id: {
          $in: args.deploymentIds.map(id => new ObjectId(removeIdPrefix(id)))
        }
      }),
      toModel: mappers.DomainDeploymentDocument.toModel
    }),
    appendDeploymentLedger: updateOne<
      t.DeploymentDocument,
      {
        id: string
        item: t.DeploymentLedgerItem
      }
    >({
      db,
      collection: 'deployments',
      toQuery: ({ id }) => ({
        _id: new ObjectId(removeIdPrefix(id))
      }),
      toUpdate: ({ item }) => ({
        $push: {
          ledger: item
        }
      })
    }),
    appendDeploymentLogChunk: updateOne<
      t.DeploymentDocument,
      {
        deploymentId: string
        chunk: t.DeploymentLogStreamChunk
      }
    >({
      db,
      collection: 'deployments',
      toQuery: ({ deploymentId }) => ({
        _id: new ObjectId(removeIdPrefix(deploymentId))
      }),
      toUpdate: ({ chunk }) => ({
        $push: {
          'logStream.chunks': chunk
        }
      })
    }),
    setDeploymentFunctions: updateOne<
      t.DeploymentDocument,
      {
        id: string
        functions: t.ExobaseFunction[]
      }
    >({
      db,
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
    setDeploymentAttributes: updateOne<
      t.DeploymentDocument,
      {
        id: string
        attributes: t.DeploymentAttributes
      }
    >({
      db,
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
      db,
      collection: 'membership',
      toDocument: (membership: t.Membership): t.MembershipDocument => ({
        ...membership,
        _version: CURRENT_VERSIONS.membership,
        _id: new ObjectId(removeIdPrefix(membership.id)),
        _userId: new ObjectId(removeIdPrefix(membership.userId)),
        _platformId: new ObjectId(removeIdPrefix(membership.platformId))
      })
    }),
    lookupUserMembership: findManyItems({
      db,
      collection: 'membership',
      toQuery: (args: { userId: string }) => ({
        _userId: new ObjectId(removeIdPrefix(args.userId))
      }),
      toModel: mappers.MembershipDocument.toModel
    }),

    //
    //  REPOSITORY / SERVICE LOOKUP
    //
    addRepositoryLookupItem: addItem({
      db,
      collection: 'repository_lookup',
      toDocument: (item: t.RepositoryServiceLookupItem): t.RepositoryServiceLookupItemDocument => ({
        ...item,
        _id: undefined, // Let mongo set this
        _version: CURRENT_VERSIONS.repository_lookup,
        _serviceId: new ObjectId(removeIdPrefix(item.serviceId)),
        _platformId: new ObjectId(removeIdPrefix(item.platformId))
      })
    }),
    lookupRepositoryServiceItems: findManyItems({
      db,
      collection: 'repository_lookup',
      toQuery: (args: { repositoryId: string }) => ({
        repositoryId: new ObjectId(removeIdPrefix(args.repositoryId))
      }),
      toModel: mappers.RepositoryServiceLookupItemDocument.toModel
    }),

    //
    //  REGISTRY
    //
    addBuildPackageToRegistry: addItem({
      db,
      collection: 'registry',
      toDocument: (pack: t.BuildPackage): t.BuildPackageDocument => ({
        ...pack,
        _id: oid(pack.id),
        _version: CURRENT_VERSIONS.registry
      })
    }),
    findBuildPackage: findItem({
      db,
      collection: 'registry',
      toQuery: ({ id }: { id: string }) => ({
        _id: oid(id)
      }),
      toModel: mappers.BuildPackageDocument.toModel
    }),
    searchRegistry: findManyItems({
      db,
      collection: 'registry',
      toQuery: (args: {
        provider?: t.CloudProvider
        type?: t.ExobaseService
        service?: t.CloudService | null
        language?: t.Language | null
      }) => args,
      toModel: mappers.BuildPackageDocument.toModel
    })
  }
}

export default createMongoClient

export type MongoClient = ReturnType<typeof createMongoClient>
