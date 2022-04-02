import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  serviceId: string
}

interface Services {
  mongo: MongoClient
}

async function removeService({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>) {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { sub: userId } = auth.token
  const { serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err || !platform) {
    throw errors.badRequest({
      details: 'Platform with given id not found',
      key: 'exo.err.services.remove.noplat'
    })
  }

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.badRequest({
      details: 'Service with given id not found',
      key: 'exo.err.services.remove.noserv'
    })
  }

  await mongo.markServiceDeleted({
    platformId,
    serviceId: service.id,
    deleteEvent: {
      userId,
      timestamp: +new Date(),
      source: 'exo.api.services.remove'
    }
  })
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
    mongo: makeMongo()
  }),
  useMongoConnection(),
  removeService
)