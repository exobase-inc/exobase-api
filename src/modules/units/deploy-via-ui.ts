import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import makeBuilder, { BuilderApi } from '../../core/builder'
import model from '../../core/model'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  unitId: t.Id<'unit'>
  platformId: t.Id<'platform'>
  workspaceId: t.Id<'workspace'>
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  deployment: t.DeploymentView
}

async function deployServiceViaUi({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, builder } = services
  const userId = auth.token.sub as t.Id<'user'>
  const { workspaceId, username, thumbnailUrl } = auth.token.extra

  if (args.workspaceId !== workspaceId) {
    throw errors.badRequest({
      details: 'Cannot create a unit of infrastructure in a workspace you are not currently authenticated with',
      key: 'exo.err.units.deploy.workspace-mismatch'
    })
  }

  const workspace = await mongo.findWorkspaceById(workspaceId)
  if (!workspace) {
    throw errors.notFound({
      details: 'Could not find a workspace matching the current session',
      key: 'exo.err.units.deploy.no-workspace'
    })
  }

  const platform = workspace.platforms.find(p => p.id === args.platformId)
  if (!platform) {
    throw errors.notFound({
      details: 'Could not find a platform matching the given id',
      key: 'exo.err.units.deploy.no-platform'
    })
  }

  const unit = platform.units.find(u => u.id === args.unitId)
  if (!unit) {
    throw errors.notFound({
      details: 'Could not find a unit matching the given id',
      key: 'exo.err.units.deploy.no-unit'
    })
  }

  const logId = model.id('log')

  const deployment: t.Deployment = {
    id: model.id('deploy'),
    type: 'create',
    logId,
    workspaceId: workspace.id,
    platformId: platform.id,
    unitId: unit.id,
    startedAt: Date.now(),
    finishedAt: null,
    status: 'queued',
    output: {},
    vars: unit.config,
    pack: unit.pack,
    trigger: {
      type: 'user-ui',
      git: null,
      user: {
        id: userId,
        username,
        thumbnailUrl
      }
    }
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
            latestDeployment: deployment,
            deployments: [...unit.deployments, deployment]
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

  const builderResponse = await builder.trigger.build(
    {
      args: {
        deploymentId: deployment.id,
        workspaceId,
        platformId: platform.id,
        unitId: unit.id,
        logId
      }
    },
    { key: config.builderApiKey }
  )
  if (builderResponse.error) {
    throw errors.unknown({
      details: `Error queuing build: ${builderResponse.error.details}`,
      key: 'exo.err.units.deploy.bad-builder'
    })
  }

  return {
    deployment: mappers.DeploymentView.toView(deployment)
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
      .required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  deployServiceViaUi
)
