import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'

import type { Props, ApiFunction } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  name: string
  type: t.ExobaseService
  provider: t.CloudProvider
  service: t.CloudService
  language: t.Language
  config: any
  source: t.ServiceSource
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

  const service: t.Service = {
    id: model.createId('service'),
    name: args.name,
    platformId,
    provider: args.provider,
    service: args.service,
    type: args.type,
    language: args.language,
    key: `${args.type}:${args.provider}:${args.service}:${args.language}`,
    source: args.source,
    tags: [],
    deployments: [],
    latestDeploymentId: null,
    latestDeployment: null,
    config: {
      type: `${args.type}:${args.provider}:${args.service}`
    }
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
  useVercel(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    name: yup.string().required(),
    type: yup.string().required(),
    provider: yup.string().required(),
    service: yup.string().required(),
    language: yup.string().required(),
    config: yup.mixed().required(),
    source: yup.object({
      installationId: yup.string().nullable(),
      private: yup.boolean(),
      repoId: yup.string().required(),
      owner: yup.string().required(),
      repo: yup.string().required(),
      branch: yup.string().required(),
      provider: yup.string().oneOf(['github', 'bitbucket', 'gitlab' ])
    }).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  createService
)