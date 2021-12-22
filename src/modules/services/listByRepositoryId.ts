import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  repositoryId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  services: t.ServiceView[]
}

async function listServicesByRepositoryId({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { repositoryId } = args

  const [err, lookupItems] = await mongo.lookupRepositoryServiceItems({
    repositoryId
  })
  if (err) throw err

  if (lookupItems.length === 0) {
    return {
      services: []
    }
  }

  const [perr, platforms] = await mongo.batchFindPlatforms({ 
    platformIds: _.unique(lookupItems.map(li => li.platformId))
  })
  if (perr) throw perr

  const results = lookupItems.map(li => {
    return platforms
      .find(p => p.id === li.platformId).services
      .find(s => s.id === li.serviceId)
  })

  return {
    services: results.map(mappers.ServiceView.fromService)
  }
}

export default _.compose(
  useVercel(),
  useCors(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'services::read',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    repositoryId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  listServicesByRepositoryId
)