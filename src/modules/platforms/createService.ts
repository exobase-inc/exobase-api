import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  name: string
  type: t.ExobaseService
  provider: t.CloudProvider
  service: t.CloudService
  language: t.Language
  source: {
    repository: string
    branch: string
  }
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
  if (err) throw err

  const key = `${args.type}:${args.provider}:${args.service}:${args.language}` as t.ServiceKey
  const serviceId = model.createId('service')
  const service: t.Service = {
    id: serviceId,
    key,
    platformId,
    name: args.name,
    type: args.type,
    provider: args.provider,
    language: args.language,
    source: args.source,
    service: args.service,
    instances: platform.environments.map(e => {
      const inst: t.ServiceInstance = {
        id: model.createId('instance'),
        environmentId: e.id,
        serviceId, 
        mute: false,
        config: {
          type: `${args.provider}:${args.service}`
        },
        deployments: [],
        attributes: {}
      }
      return inst
    })
  }

  await mongo.addServiceToPlatform({ service })

  return {
    service: mappers.ServiceView.fromService(service)
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
    name: yup.string().required(),
    type: yup.string().required(),
    provider: yup.string().required(),
    service: yup.string().required(),
    language: yup.string().required(),
    source: yup.object({
      repository: yup.string().required(),
      branch: yup.string().required()
    }).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  createService
)