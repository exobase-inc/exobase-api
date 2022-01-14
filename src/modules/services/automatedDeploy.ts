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
  platformId: string
  serviceId: string
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  deployment: t.DeploymentView
}

async function automatedDeployService({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo, builder } = services
  const { platformId, serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.badRequest({
      details: 'Service with given id not found',
      key: 'exo.err.services.automated-deploy.hohoho'
    })
  }

  const deployment: t.Deployment = {
    id: model.createId('deployment'),
    type: 'create',
    platformId,
    serviceId,
    logs: '',
    timestamp: +new Date(),
    gitCommitId: null,
    ledger: [{
      status: 'queued',
      timestamp: +new Date(),
      source: 'exo.api'
    }],
    config: service.config,
    attributes: null,
    trigger: {
      type: 'source',
      source: service.source
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
  }, { key: config.builderApiKey })

  return {
    deployment: mappers.DeploymentView.fromDeployment(deployment)
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'services::deploy',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required(),
    serviceId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  automatedDeployService
)