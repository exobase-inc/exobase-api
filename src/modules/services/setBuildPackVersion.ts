import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  platformId: string
  serviceId: string
  version: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  service: t.ServiceView
}

async function setBuildPackVersion({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId, serviceId, version } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.notFound({
      details: 'Could not find a service with the given id in the current platform',
      key: 'exo.err.services.set-build-pack-version.unfound'
    })
  }

  if (service.buildPack.version) {
    throw errors.badRequest({
      details: 'The build pack version is immutable and has already been set',
      key: 'exo.err.services.set-build-pack-version.immutable'
    })
  }

  const newService: t.Service = {
    ...service,
    buildPack: {
      name: service.buildPack.name,
      version
    }
  }

  await mongo.updateServiceInPlatform({
    id: platformId,
    service: newService
  })

  return {
    service: mappers.ServiceView.fromService(newService)
  }
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'service::update',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required(),
    serviceId: yup.string().required(),
    version: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  setBuildPackVersion
)