import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'
import model from '../../core/model'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  name: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  platform: t.PlatformView
}

async function createPlatform({ services, args, auth }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { sub: userId } = auth.token

  const platformId = model.createId('platform')
  const membershipId = model.createId('membership')

  const membership: t.Membership = {
    id: membershipId,
    userId,
    platformId,
    acl: 'owner'
  }
  const platform: t.Platform = {
    id: platformId,
    name: args.name,
    membership: [membership],
    services: [],
    providers: {},
    domains: [],
    _githubInstallations: []
  }

  const [merr] = await mongo.addMembership(membership)
  if (merr) throw merr

  const [perr] = await mongo.addPlatform(platform)
  if (perr) throw perr

  return {
    platform: mappers.PlatformView.fromPlatform(platform)
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs<Args>(yup => ({
    name: yup.string().required()
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
  createPlatform
)