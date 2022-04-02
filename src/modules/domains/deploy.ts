import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import makeBuilder, { BuilderApi } from '../../core/builder'
import model from '../../core/model'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  platformId: string
  domainId: string
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  domain: t.DomainView
  deployment: t.DomainDeploymentView
}

async function deployDomain({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, builder } = services
  const { domainId } = args
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const domain = platform.domains.find(d => d.id === domainId)
  if (!domain) {
    throw errors.notFound({
      details: 'Could not find a domain with the given id',
      key: 'exo.err.domains.deploy.nofound'
    })
  }

  const deployment: t.DomainDeployment = {
    id: model.createId('deployment'),
    platformId,
    domainId,
    logStream: {
      chunks: []
    },
    ledger: [{
      status: 'queued',
      timestamp: +new Date(),
      source: 'exo.api'
    }]
  }

  const updatedDomain: t.Domain = {
    ...domain,
    latestDeploymentId: deployment.id,
  }

  // TODO: Handle errors like a boss
  await mongo.addDomainDeployment(deployment)
  await mongo.updateDomainInPlatform({ id: platformId, domain: updatedDomain })

  await builder.trigger.build({
    args: {
      action: 'deploy-domain',
      deploymentId: deployment.id
    }
  }, { key: config.builderApiKey })

  return {
    domain: mappers.DomainView.fromDomain({
      ...domain,
      deployments: [
        ...domain.deployments,
        deployment
      ]
    }),
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
    platformId: yup.string().required(),
    domainId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  useMongoConnection(),
  deployDomain
)