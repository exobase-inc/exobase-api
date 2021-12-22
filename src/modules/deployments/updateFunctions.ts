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
  functions: t.ExobaseFunction[]
}

interface Services {
  mongo: MongoClient
}

async function updateDeploymentFunctions({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { functions } = args

  const [err] = await mongo.setDeploymentFunctions({ id: args.deploymentId, functions })
  if (err) throw err

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
    functions: yup.array().of(
      yup.object().shape({
        module: yup.string(),
        function: yup.string()
      })
    ).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateDeploymentFunctions
)