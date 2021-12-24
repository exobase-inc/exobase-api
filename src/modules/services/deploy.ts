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
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  serviceId: string
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  deployment: t.DeploymentView
}

async function deployService({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, builder } = services
  const { platformId } = auth.token.extra
  const { serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.badRequest({
      details: 'Service with given id not found',
      key: 'exo.err.platforms.deploy-service.masha'
    })
  }

  const deployment: t.Deployment = {
    id: model.createId('deployment'),
    platformId,
    serviceId,
    logs: '',
    gitCommitId: null,
    ledger: [{
      status: 'queued',
      timestamp: +new Date(),
      source: 'exo.api'
    }],
    config: service.config,
    attributes: {},
    functions: []
  }

  // TODO: Handle errors like a boss
  await mongo.addDeployment(deployment)
  await mongo.updateServiceLatestDeploymentId(deployment)

  await builder.deployments.deployStack({
    deploymentId: deployment.id
  })

  return {
    deployment: mappers.DeploymentView.fromDeployment(deployment)
  }
}

export default _.compose(
  useVercel(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    serviceId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  deployService
)