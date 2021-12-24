import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'

import type { Props } from '@exobase/core'
import { useCors, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {}

interface Services {
  mongo: MongoClient
}

interface Response {
  deployments: t.DeploymentView[]
}

async function getLatestDeployments({ services, auth }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const deploymentIds = platform.services.map(i => i.latestDeploymentId).filter(x => !!x)

  if (deploymentIds.length === 0) {
    return { deployments: [] }
  }

  const [derr, deployments] = await mongo.batchFindDeployments({ deploymentIds })
  if (derr) throw derr

  return {
    deployments: deployments.map(mappers.DeploymentView.fromDeployment)
  }
}

export default _.compose(
  useVercel(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo()
  }),
  getLatestDeployments
)