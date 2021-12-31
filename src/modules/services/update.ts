import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { Props, ApiFunction, errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  id: string
  name?: string
  tags?: string[]
  type?: t.ExobaseService
  provider?: t.CloudProvider
  service?: t.CloudService
  language?: t.Language
  config?: t.ServiceConfig
  source?: t.ServiceSource
}

interface Services {
  mongo: MongoClient
}

interface Response {
  service: t.ServiceView
}

async function updateService({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { id: serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.notFound({
      details: 'Could not find a service with the given id in the current platform',
      key: 'exo.err.services.update.unfound'
    })
  }

  const newService: t.Service = {
    ...service,
    ...args
  }

  await mongo.updateServiceInPlatform({
    id: platformId,
    service: newService
  })

  return {
    service: mappers.ServiceView.fromService(newService)
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
    id: yup.string().required(),
    name: yup.string(),
    tags: yup.array().of(yup.string()),
    type: yup.string(),
    provider: yup.string(),
    service: yup.string(),
    language: yup.string(),
    config: yup.mixed(),
    source: yup.object({
      installationId: yup.string().nullable(),
      private: yup.boolean(),
      repoId: yup.string().required(),
      owner: yup.string().required(),
      repo: yup.string().required(),
      branch: yup.string().required(),
      provider: yup.string().oneOf(['github', 'bitbucket', 'gitlab' ])
    })
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateService
)