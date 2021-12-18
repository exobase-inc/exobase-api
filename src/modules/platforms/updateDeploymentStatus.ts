import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  deploymentId: string
  status: t.DeploymentStatus
  source: string
  logs?: string
}

interface Services {
  mongo: MongoClient
}

async function updateDeploymentStatus({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services

  const ledgerItem: t.DeploymentLedgerItem = {
    status: args.status,
    timestamp: +new Date(),
    source: args.source
  }

  const [err] = await mongo.appendDeploymentLedger({
    id: args.deploymentId,
    ...ledgerItem
  })
  if (err) throw err

  if (args.logs) {
    await mongo.appendDeploymentLogs({ id: args.deploymentId, logs: args.logs })
  }

}

export default _.compose(
  useVercel(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::update',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    deploymentId: yup.string().required(),
    status: yup.string().oneOf([
      'queued', 
      'canceled', 
      'in_progress',
      'success', 
      'partial_success', 
      'failed'
    ]).required(),
    source: yup.string().required(),
    logs: yup.string()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateDeploymentStatus
)