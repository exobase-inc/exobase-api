import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  id: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  platform: t.PlatformView
}

async function listPlatformsForUser({ services, args }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { id: platformId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  return {
    platform: platform ? mappers.PlatformView.fromPlatform(platform) : null
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs<Args>(yup => ({
    id: yup.string().required()
  })),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  listPlatformsForUser
)