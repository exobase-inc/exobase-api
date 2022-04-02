import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'
import { useMagicAuthentication, MagicAuth } from '../../core/magic'
import mappers from '../../core/view/mappers'

import type { Props } from '@exobase/core'
import { useCors, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { createToken } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {}

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

async function loginOrCreateUser({ services, auth }: Props<Args, Services, MagicAuth>): Promise<Response> {
  const { mongo } = services
  const { userId: did, email } = auth.magic

  const getExistingUserData = async (user: t.User): Promise<{ user: t.User, platforms: t.Platform[] }> => {

    const [err, memberships] = await mongo.lookupUserMembership({ userId: user.id })
    if (err) throw err

    const platformIds = _.unique(memberships.map(m => m.platformId))

    const [perr, platforms] = await mongo.batchFindPlatforms({ platformIds })
    if (perr) throw perr

    return { user, platforms }
  }

  const createUserData = async (): Promise<{ user: t.User, platforms: t.Platform[] }> => {
    const platformId = model.createId('platform')
    const userId = model.createId('user')
    const user: t.User = {
      id: userId,
      did,
      email,
      acl: 'user',
      username: model.username(email)
    }
    const membership: t.Membership = {
      id: model.createId('membership'),
      userId,
      platformId,
      acl: 'owner'
    }
    const platform: t.Platform = {
      id: platformId,
      name: 'Exobase Starter',
      membership: [membership],
      services: [],
      providers: {},
      domains: [],
      _githubInstallations: []
    }

    const [uerr] = await mongo.addUser(user)
    if (uerr) throw uerr

    const [perr] = await mongo.addPlatform(platform)
    if (perr) throw perr

    const [merr] = await mongo.addMembership(membership)
    if (merr) throw merr

    return { user, platforms: [platform] }
  }

  const [err, existingUser] = await mongo.findUserByEmail({ email })
  if (err) throw err

  const { platforms, user } = existingUser
    ? await getExistingUserData(existingUser)
    : await createUserData()

  const firstPlatform = _.first(platforms)

  return {
    user: mappers.UserView.fromUser(user),
    platforms: platforms.map(mappers.PlatformPreviewView.fromPlatform),
    platformId: firstPlatform.id,
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
        platformId: firstPlatform.id,
        username: user.username
      }
    })
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useMagicAuthentication(config.magicSecret),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  loginOrCreateUser
)