import _ from 'radash'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import * as t from '../../core/types'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  deploymentId: string
  chunk: t.DeploymentLogStreamChunk
}

interface Services {
  mongo: MongoClient
}

async function appendLogChunk({ args, services }: Props<Args, Services>) {
  const { mongo } = services
  const [err] = await mongo.appendDeploymentLogChunk({ 
    deploymentId: args.deploymentId,
    chunk: args.chunk
  })
  if (err) throw err  
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::update',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    deploymentId: yup.string().required(),
    chunk: yup.object({
      timestamp: yup.number().integer().positive().required(),
      content: yup.string().required()
    }).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  appendLogChunk
)