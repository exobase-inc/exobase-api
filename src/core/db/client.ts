import _ from 'radash'
import * as Mongo from 'mongodb'
import { ObjectId } from 'mongodb'
import * as t from '../types'
import * as mappers from './mappers'
import { addItem, findItem, findManyItems, queryAll, updateOne } from './methods'
import { CURRENT_VERSIONS } from './collections'

const deprefix = (str: t.Id) => str.replace(/exo\..+?\./, '')
const oid = (id: t.Id) => new ObjectId(deprefix(id))

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
        _id: oid(user.id)
      })
    }),
    findUserId: findItem({
      db,
      collection: 'users',
      toQuery: ({ userId }: { userId: t.Id<'user'> }) => ({
        _id: oid(userId)
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
    // WORKSPACE
    //
    addWorkspace: addItem({
      db,
      collection: 'workspaces',
      toDocument: (workspace: t.Workspace): t.WorkspaceDocument => ({
        ...workspace,
        _version: CURRENT_VERSIONS.workspaces,
        _id: oid(workspace.id),
        _repos: _.objectify(
          _.flat(workspace.platforms.map(p => p.units.map(u => u.source?.repoId))).filter(x => !!x),
          x => x,
          x => true
        ),
        _members: _.objectify(
          workspace.members,
          m => deprefix(m.userId),
          m => true
        ),
        _platforms: _.objectify(
          workspace.platforms,
          m => deprefix(m.id),
          m => true
        )
      })
    }),
    findWorkspaceById: findItem({
      db,
      collection: 'workspaces',
      toQuery: (id: t.Id<'workspace'>) => ({
        _id: oid(id)
      }),
      toModel: mappers.WorkspaceDocument.toModel
    }),
    findWorkspacesForUser: findManyItems({
      db,
      collection: 'workspaces',
      toQuery: (args: { userId?: t.Id<'user'> }) => ({
        [`_members.${deprefix(args.userId)}`]: true
      }),
      toModel: mappers.WorkspaceDocument.toModel
    }),
    updateWorkspace: updateOne<
      t.WorkspaceDocument,
      {
        id: t.Id<'workspace'>
        workspace: t.Workspace
      }
    >({
      db,
      collection: 'workspaces',
      toQuery: ({ id }) => ({
        _id: oid(id)
      }),
      toUpdate: ({ workspace }) => ({
        $set: {
          ...workspace,
          _id: oid(workspace.id),
          _repos: _.objectify(
            _.flat(workspace.platforms.map(p => p.units.map(u => u.source?.repoId))).filter(x => !!x),
            x => x,
            x => true
          ),
          _members: _.objectify(
            workspace.members,
            m => deprefix(m.userId),
            m => true
          ),
          _platforms: _.objectify(
            workspace.platforms,
            m => deprefix(m.id),
            m => true
          )
        }
      })
    }),

    //
    //  LOGS
    //
    addLog: addItem({
      db,
      collection: 'logs',
      toDocument: (log: t.Log): t.LogDocument => ({
        ...log,
        _version: CURRENT_VERSIONS.logs,
        _id: oid(log.id),
        _platformId: oid(log.platformId),
        _unitId: oid(log.unitId),
        _workspaceId: oid(log.workspaceId),
        _deploymentId: oid(log.deploymentId)
      })
    }),
    findLog: findItem({
      db,
      collection: 'logs',
      toQuery: ({ logId }: { logId: t.Id<'log'> }) => ({
        _id: oid(logId)
      }),
      toModel: mappers.LogDocument.toModel
    }),
    appendLogChunk: updateOne<
      t.LogDocument,
      {
        logId: t.Id<'log'>
        chunk: {
          timestamp: number
          content: string
        }
      }
    >({
      db,
      collection: 'logs',
      toQuery: ({ logId }) => ({
        _id: oid(logId)
      }),
      toUpdate: ({ chunk }) => ({
        $push: {
          stream: chunk
        }
      })
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
    findBuildPackageById: findItem({
      db,
      collection: 'registry',
      toQuery: ({ id }: { id: t.Id<'pack'> }) => ({
        _id: oid(id)
      }),
      toModel: mappers.BuildPackageDocument.toModel
    }),
    findBuildPackage: findItem({
      db,
      collection: 'registry',
      toQuery: ({
        provider,
        name,
        owner,
        type
      }: {
        provider: t.CloudProvider
        name: string
        owner: string
        type: t.ExobaseService
      }) => ({
        name,
        provider,
        owner,
        type
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
    }),
    updateBuildPackage: updateOne<
      t.BuildPackageDocument,
      {
        id: t.Id<'pack'>
        pack: t.BuildPackage
      }
    >({
      db,
      collection: 'registry',
      toQuery: ({ id }) => ({
        _id: oid(id)
      }),
      toUpdate: ({ pack }) => ({
        $set: {
          ...pack
        }
      })
    })
  }
}

export default createMongoClient

export type MongoClient = ReturnType<typeof createMongoClient>
