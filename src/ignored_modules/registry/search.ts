import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import mappers from '../../core/view/mappers'

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
  packs: t.BuildPackageView[]
}

async function searchBuildPackages({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services

  // TODO: Consider paginating
  const packs = await mongo.searchRegistry(args)

  return {
    packs: packs.map(mappers.BuildPackageView.toView)
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs<Args>(yup => ({
    provider: yup.string().optional(),
    type: yup.string().optional(),
    service: yup.string().optional(),
    language: yup.string().optional()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  searchBuildPackages
)
