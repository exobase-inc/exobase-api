import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  provider?: t.CloudProvider
  type?: t.ExobaseService
  service?: t.CloudService
  language?: t.Language
}

interface Services {
  mongo: MongoClient
}

interface Response {
  packs: t.BuildPackage[]
}

async function searchBuildPackages({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services

  if (Object.keys(args).length === 0) {
    throw errors.badRequest({
      details: 'Cannot search registry with no search arguments',
      key: 'exo.err.registry.search.no-arguments'
    })
  }

  // TODO: Consider paginating
  const [err, packs] = await mongo.searchRegistry(args)
  if (err) throw err

  return {
    packs
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
    provider: yup.string().optional(),
    type: yup.string().optional(),
    service: yup.string().optional(),
    language: yup.string().optional()
  })),
  useService<Services>({
    mongo: makeMongo(),
  }),
  searchBuildPackages
)