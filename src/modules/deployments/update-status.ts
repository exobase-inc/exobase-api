import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  unitId: t.Id<'unit'>
  deploymentId: t.Id<'deploy'>
  status: t.DeploymentStatus
}

interface Services {
  mongo: MongoClient
}

async function updateDeploymentStatus({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services

  const workspace = await mongo.findWorkspaceById(args.workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)
  const unit = platform.units.find(u => u.id === args.unitId)
  const deployment = unit.deployments.find(d => d.id === args.deploymentId)

  const updatedDeployemnt: t.Deployment = {
    ...deployment,
    status: args.status
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
            latestDeployment: unit.latestDeployment?.id === updatedDeployemnt.id ? updatedDeployemnt : unit.latestDeployment,
            activeDeployment: args.status === 'success' ? updatedDeployemnt : unit.activeDeployment,
            deployments: _.replace(
              unit.deployments,
              updatedDeployemnt,
              d => d.id === deployment.id
            )
          },
          u => u.id === unit.id
        )
      },
      p => p.id === platform.id
    )
  }
  await mongo.updateWorkspace({
    id: workspace.id,
    workspace: newWorkspace
  })
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::update',
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
      .required(),
    status: yup.string().oneOf(['failed', 'in_progress', 'partial_success', 'success'] as t.DeploymentStatus[]).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateDeploymentStatus
)
