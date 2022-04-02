import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  deploymentId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  context: t.DeploymentContextView
}

async function getDeploymentContext({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { deploymentId } = args

  const [err, deployment] = await mongo.findDeploymentById({ id: deploymentId })
  if (err) throw err

  const [perr, platform] = await mongo.findPlatformById({ id: deployment.platformId })
  if (perr) throw perr

  return {
    context: mappers.DeploymentContextView.fromModels({
      platform, 
      deployment
    })
  }
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::read::elevated',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    deploymentId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  getDeploymentContext
)