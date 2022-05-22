import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  unitId: t.Id<'unit'>
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
}

interface Services {
  mongo: MongoClient
}

async function removeUnitOfInfrastructure({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>) {
  const { mongo } = services
  const { workspaceId, username, thumbnailUrl } = auth.token.extra
  const userId = auth.token.sub as t.Id<'user'>

  if (args.workspaceId !== workspaceId) {
    throw errors.badRequest({
      details: 'Cannot create a unit of infrastructure in a workspace you are not currently authenticated with',
      key: 'exo.err.units.remove.workspace-mismatch'
    })
  }

  const workspace = await mongo.findWorkspaceById(workspaceId)
  if (!workspace) {
    throw errors.notFound({
      details: 'Could not find a workspace matching the current session',
      key: 'exo.err.units.remove.no-workspace'
    })
  }

  const platform = workspace.platforms.find(p => p.id === args.platformId)
  if (!platform) {
    throw errors.notFound({
      details: 'Could not find a platform matching the given id',
      key: 'exo.err.units.remove.no-platform'
    })
  }

  const unit = platform.units.find(u => u.id === args.unitId)
  if (!unit) {
    throw errors.notFound({
      details: 'Could not find a unit matching the given id',
      key: 'exo.err.units.remove.no-unit'
    })
  }


  const newWorkspace: t.Workspace = {
    ...workspace,
    platforms: _.replace(
      workspace.platforms,
      {
        ...platform,
        units: _.replace(
          platform.units,
          {
            ...unit,
            deleted: true,
            ledger: [...unit.ledger, {
              timestamp: Date.now(),
              event: 'unit-deleted',
              userId,
              user: {
                id: userId,
                username,
                thumbnailUrl
              },
              snapshot: null
            }]
          },
          u => u.id === unit.id
        )
      },
      p => p.id === platform.id
    )
  }
  // TODO: Handle errors like a boss
  await mongo.updateWorkspace({
    id: workspace.id,
    workspace: newWorkspace
  })
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    workspaceId: yup
      .string()
      .matches(/^exo\.workspace\.[a-z0-9]+$/)
      .required(),
    platformId: yup
      .string()
      .matches(/^exo\.platform\.[a-z0-9]+$/)
      .required(),
    unitId: yup
      .string()
      .matches(/^exo\.unit\.[a-z0-9]+$/)
      .required(),
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  removeUnitOfInfrastructure
)