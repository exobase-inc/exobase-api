import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  deploymentId: string
  status: t.DeploymentStatus
  source: string
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

  const [derr, deployment] = await mongo.findDeploymentById({ id: args.deploymentId })
  if (derr || !deployment) {
    throw errors.notFound({
      details: 'Deployment with given id not found',
      key: 'exo.err.deployments.update-status.nofo'
    })
  }

  const [err] = await mongo.appendDeploymentLedger({
    id: args.deploymentId,
    item: ledgerItem
  })
  if (err) throw err
  
  const updatedDeployment: t.Deployment = {
    ...deployment,
    ledger: [
      ...deployment.ledger,
      ledgerItem
    ]
  }

  await mongo.updateServiceLatestDeployment(updatedDeployment)
  
  if (args.status === 'success') {  
    await mongo.updateServiceActiveDeployment(updatedDeployment)
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
    source: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateDeploymentStatus
)