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
  domain: string
  provider: t.CloudProvider
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  domain: t.DomainView
  deployment: t.DomainDeploymentView
}

async function addDomain({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, builder } = services
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const existingDomain = platform.domains.find(d => d.domain === args.domain)
  if (existingDomain) {
    throw errors.badRequest({
      details: 'Domain already exists',
      key: 'exo.err.platforms.add-domain.allradius'
    })
  }

  const provider = platform.providers[args.provider] as t.AWSProviderConfig
  if (!provider?.accessKeyId) {
    throw errors.badRequest({
      details: `Provider (${args.provider}) has not been configured`,
      key: 'exo.err.platforms.add-domain.mellowa'
    })
  }

  const domainId = model.createId('domain')

  const deployment: t.DomainDeployment = {
    id: model.createId('deployment'),
    platformId,
    domainId,
    logs: '',
    ledger: [{
      status: 'queued',
      timestamp: +new Date(),
      source: 'exo.api'
    }]
  }

  const domain: t.Domain = {
    id: domainId,
    platformId,
    domain: args.domain,
    provider: args.provider,
    latestDeploymentId: deployment.id,
    deployments: [deployment]
  }

  // TODO: Handle errors like a boss
  await mongo.addDomainDeployment(deployment)
  await mongo.addDomainToPlatform(domain)

  await builder.trigger.build({
    args: {
      action: 'deploy-domain',
      deploymentId: deployment.id
    }
  }, { key: config.builderApiKey })

  return {
    domain: mappers.DomainView.fromDomain(domain),
    deployment: mappers.DomainDeploymentView.fromDomainDeployment(deployment)
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
    domain: yup.string().required(),
    provider: yup.string().oneOf(['aws', 'gcp']).required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  addDomain
)