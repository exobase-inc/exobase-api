import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'

import { Props, ApiFunction, errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  name: string
  tags: string[]
  type: t.ExobaseService
  provider: t.CloudProvider
  service: t.CloudService
  language: t.Language
  config: t.ServiceConfig
  source: t.ServiceSource
  domain: {
    domain: string
    subdomain: string
  } | null
}

interface Services {
  mongo: MongoClient
}

interface Response {
  service: t.ServiceView
}

async function createService({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) {
    throw errors.notFound({
      details: 'Could not find a platform matching the current session',
      key: 'exo.err.services.create.noplat'
    })
  }

  const domain: t.ServiceDomainConfig = (() => {
    if (!args.domain) return null
    const matchedDomain = platform.domains.find(x => x.domain === args.domain.domain)
    if (!matchedDomain) {
      throw errors.notFound({
        details: 'Could not find the domain specified',
        key: 'exo.err.services.create.nodom'
      })
    }
    // TODO: Validate that domain is in success status
    return {
      ...args.domain,
      fqd: args.domain.subdomain
        ? `${args.domain.subdomain}.${args.domain.domain}`
        : args.domain.domain
    }
  })()

  const service: t.Service = {
    id: model.createId('service'),
    name: args.name,
    platformId,
    tags: args.tags,
    provider: args.provider,
    service: args.service,
    type: args.type,
    language: args.language,
    key: `${args.type}:${args.provider}:${args.service}:${args.language}`,
    source: args.source,
    deployments: [],
    latestDeployment: null,
    activeDeployment: null,
    config: args.config,
    domain,
    isDeleted: false,
    deleteEvent: null,
    createdAt: +new Date()
  }

  await mongo.addServiceToPlatform({ service })
  await mongo.addRepositoryLookupItem({
    repositoryId: service.source.repoId,
    serviceId: service.id,
    platformId: service.platformId,
  })

  return {
    service: mappers.ServiceView.fromService(service)
  }
}

export type RootHook = (func: ApiFunction<any, any>) => (...rest: any[]) => any
export const useDynamicRoot = (
  roots: Record<string, RootHook>,
  getRootKey: () => string = () => process.env.EXO_ROOT_HOOK
) => {
  return roots[getRootKey()]
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
    name: yup.string().required(),
    tags: yup.array().of(yup.string()).required(),
    type: yup.string().required(),
    provider: yup.string().required(),
    service: yup.string().required(),
    language: yup.string().required(),
    config: yup.mixed().required(),
    domain: yup.object({ // TODO: Improve validation + .required()
      subdomain: yup.string(),
      domain: yup.string()
    }).nullable(),
    source: yup.object({
      installationId: yup.string().nullable(),
      private: yup.boolean(),
      repoId: yup.string().required(),
      owner: yup.string().required(),
      repo: yup.string().required(),
      branch: yup.string().required(),
      provider: yup.string().oneOf(['github', 'bitbucket', 'gitlab'])
    }).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  createService
)