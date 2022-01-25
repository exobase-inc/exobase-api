import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs, useCors } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  deploymentId: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  logStream: t.DeploymentLogStream
}

async function getLogStream({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services
  const { deploymentId } = args
  const [err, deployment] = await mongo.findDeploymentById({ id: deploymentId })
  if (err) throw err
  return {
    logStream: deployment.logStream
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
    deploymentId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  getLogStream
)