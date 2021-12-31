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
  attributes: t.DeploymentAttributes
}

interface Services {
  mongo: MongoClient
}

async function updateDeploymentAttributes({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { attributes } = args

  const [err] = await mongo.setDeploymentAttributes({ id: args.deploymentId, attributes })
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
    attributes: yup.object({
      functions: yup.array().of(yup.object({
        module: yup.string(),
        function: yup.string()
      })),
      url: yup.string(),
      version: yup.string(),
      outputs: yup.mixed()
    })
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateDeploymentAttributes
)