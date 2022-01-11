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
  const { sub: userId } = auth.token
  const { platformId, username } = auth.token.extra
  const { serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.badRequest({
      details: 'Service with given id not found',
      key: 'exo.err.services.deploy.masha'
    })
  }

  const providerConfig = platform.providers[service.provider]
  if (!providerConfig) {
    throw errors.badRequest({
      details: 'Attempting to deploy a service to a cloud provider that has not been configured',
      key: 'exo.err.services.deploy.unconfigured'
    })
  }

  const deployment: t.Deployment = {
    id: model.createId('deployment'),
    type: 'create',
    platformId,
    serviceId,
    timestamp: +new Date(),
    logs: '',
    gitCommitId: null,
    ledger: [{
      status: 'queued',
      timestamp: +new Date(),
      source: 'exo.api'
    }],
    config: service.config,
    attributes: null,
    trigger: {
      type: 'user',
      user: {
        id: userId,
        username
      }
    }
  }

  // TODO: Handle errors like a boss
  await mongo.addDeployment(deployment)
  await mongo.updateServiceLatestDeployment(deployment)

  await builder.trigger.build({
    args: {
      action: 'deploy-stack',
      deploymentId: deployment.id
    }
  })

  return {
    deployment: mappers.DeploymentView.fromDeployment(deployment)
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
    serviceId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  deployService
)