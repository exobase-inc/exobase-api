import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'

import type { Props } from '@exobase/core'
import { useCors, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {}

interface Services {
  mongo: MongoClient
}

interface Response {
  platforms: t.PlatformView[]
}

async function listPlatformsForUser({ auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { sub: userId } = auth.token

  const [err, memberships] = await mongo.lookupUserMembership({ userId })
  if (err) throw err

  const platformIds = _.unique(memberships.map(m => m.platformId))
  const [perr, platforms] = await mongo.batchFindPlatforms({ platformIds })
  if (perr) throw perr

  return {
    platforms: platforms.map(mappers.PlatformView.fromPlatform)
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
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  listPlatformsForUser
)