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
  serviceId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  deployments: t.DeploymentView[]
}

async function listDeploymentsForService({ args, services, auth }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { serviceId } = args

  const [derr, deployments] = await mongo.listDeploymentsForService({ 
    platformId,
    serviceId 
  })
  if (derr) throw derr

  return {
    deployments: deployments.map(mappers.DeploymentView.fromDeployment)
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
    serviceId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  listDeploymentsForService
)