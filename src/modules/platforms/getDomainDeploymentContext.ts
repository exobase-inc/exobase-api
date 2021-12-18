import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  deploymentId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  context: t.DomainDeploymentContextView
}

async function getDeploymentContext({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { deploymentId } = args

  const [err, deployment] = await mongo.findDomainDeploymentById({ id: deploymentId })
  if (err) throw err

  const [perr, platform] = await mongo.findPlatformById({ id: deployment.platformId })
  if (perr) throw perr

  return {
    context: mappers.DomainDeploymentContextView.fromModels({
      platform,
      deployment
    })
  }
}

export default _.compose(
  useVercel(),
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
  getDeploymentContext
)