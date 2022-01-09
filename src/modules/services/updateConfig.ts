import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { Props, errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  serviceId: string
  config: t.ServiceConfig
}

interface Services {
  mongo: MongoClient
}

interface Response {
  service: t.ServiceView
}

async function updateConfig({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { serviceId } = args

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
    config: args.config
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
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    serviceId: yup.string().required(),
    config: yup.mixed().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateConfig
)