import * as _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  unitId: t.Id<'unit'>
  deploymentId: t.Id<'deploy'>
}

interface Services {
  mongo: MongoClient
}

interface Response {
  context: t.DeploymentContextView
}

async function getDeploymentContext({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const workspace = await mongo.findWorkspaceById(args.workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)
  const unit = platform.units.find(u => u.id === args.unitId)
  const deployment = unit.deployments.find(d => d.id === args.deploymentId)
  return {
    context: mappers.DeploymentContextView.toView({
      workspace,
      platform,
      unit,
      provider: platform.providers[unit.pack.provider],
      deployment
    })
  }
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::read::elevated',
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
    deploymentId: yup
      .string()
      .matches(/^exo\.deploy\.[a-z0-9]+$/)
      .required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  getDeploymentContext
)
