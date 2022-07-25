import * as _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import { Props, errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  unitId: t.Id<'unit'>
  name?: string
  tags?: {
    name: string
    value: string
  }[]
  config?: any
  source?: {
    installationId: string | null
    private: boolean
    repoId: string
    owner: string
    repo: string
    branch: string
    provider: 'github'
  }
}

interface Services {
  mongo: MongoClient
}

interface Response {
  unit: t.UnitView
}

async function updateUnitOfInfrastructure({
  auth,
  args,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { workspaceId, username, thumbnailUrl } = auth.token.extra
  const userId = auth.token.sub as t.Id<'user'>

  if (args.workspaceId !== workspaceId) {
    throw errors.badRequest({
      details: 'Cannot create a unit of infrastructure in a workspace you are not currently authenticated with',
      key: 'exo.err.units.update.workspace-mismatch'
    })
  }

  const workspace = await mongo.findWorkspaceById(workspaceId)
  if (!workspace) {
    throw errors.notFound({
      details: 'Could not find a workspace matching the current session',
      key: 'exo.err.units.update.no-workspace'
    })
  }

  const platform = workspace.platforms.find(p => p.id === args.platformId)
  if (!platform) {
    throw errors.notFound({
      details: 'Could not find a platform matching the given id',
      key: 'exo.err.units.update.no-platform'
    })
  }

  const unit = platform.units.find(u => u.id === args.unitId)
  if (!unit) {
    throw errors.notFound({
      details: 'Could not find a unit matching the given id',
      key: 'exo.err.units.update.no-unit'
    })
  }

  const newUnit: t.Unit = {
    ...unit,
    ..._.shake({
      name: args.name,
      tags: args.tags,
      config: args.config,
      source: args.source
    }),
    ledger: [
      ...unit.ledger,
      {
        timestamp: Date.now(),
        event: 'unit-updated',
        userId,
        user: {
          id: userId,
          username,
          thumbnailUrl
        },
        snapshot: _.shake({
          ...unit,
          ledger: undefined,
          deployments: undefined
        })
      }
    ]
  }
  const newWorkspace: t.Workspace = {
    ...workspace,
    platforms: _.replace(
      workspace.platforms,
      {
        ...platform,
        units: _.replace(platform.units, newUnit, u => u.id === unit.id)
      },
      p => p.id === platform.id
    )
  }
  // TODO: Handle errors like a boss
  await mongo.updateWorkspace({
    id: workspace.id,
    workspace: newWorkspace
  })

  return {
    unit: mappers.UnitView.toView(newUnit)
  }
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
    name: yup.string(),
    tags: yup.array().of(
      yup.object({
        name: yup.string(),
        value: yup.string()
      })
    ).nullable().default(undefined),
    config: yup.mixed().nullable().default(undefined),
    source: yup.object({
      installationId: yup.string().nullable(),
      private: yup.boolean(),
      repoId: yup.string(),
      owner: yup.string(),
      repo: yup.string(),
      branch: yup.string(),
      provider: yup.string().oneOf(['github'])
    }).nullable().default(undefined)
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateUnitOfInfrastructure
)
