import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { createToken, useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  platformId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  user: t.UserView
  platforms: t.PlatformPreviewView[]
  platformId: string
  idToken: string
  exp: number
}

async function switchPlatform({ services, args, auth }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { sub: userId } = auth.token
  const { platformId } = args

  const [uerr, user] = await mongo.findUserId({ userId })
  if (uerr) throw uerr

  const [err, memberships] = await mongo.lookupUserMembership({ userId })
  if (err) throw err

  const platformIds = _.unique(memberships.map(m => m.platformId))

  const [perr, platforms] = await mongo.batchFindPlatforms({ platformIds })
  if (perr) throw perr

  return {
    user: mappers.UserView.fromUser(user),
    platforms: platforms.map(mappers.PlatformPreviewView.fromPlatform),
    platformId,
    exp: Math.floor(Date.now() + (1200 * 1000)),
    idToken: createToken({
      sub: user.id,
      iss: 'exo.api',
      ttl: 1200, // seconds (20 minutes)
      type: 'id',
      aud: 'exo.app',
      entity: 'user',
      provider: 'magic',
      tokenSignatureSecret: config.tokenSignatureSecret,
      extra: {
        platformId,
        username: user.username
      }
    })
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required()
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
  switchPlatform
)