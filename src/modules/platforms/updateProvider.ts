import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  provider: t.CloudProvider
  config: t.AWSProviderConfig | t.GCPProviderConfig | t.VercelProviderConfig
}

interface Services {
  mongo: MongoClient
}

async function updateProviderConfig({ args, auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { provider, config } = args

  const [err] = await mongo.updatePlatformConfig({
    id: platformId,
    provider,
    config
  })
  if (err) throw err

  return
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
    provider: yup.string().oneOf(['vercel', 'aws', 'gcp', 'heroku']).required(),
    config: yup.object({
      accessKeyId: yup.string().when('provider', {
        is: 'aws',
        then: yup.string().required()
      }),
      accessKeySecret: yup.string().when('provider', {
        is: 'aws',
        then: yup.string().required()
      }),
      region: yup.string().when('provider', {
        is: 'aws',
        then: yup.string().required()
      }),
      jsonCredential: yup.string().when('provider', {
        is: 'gcp',
        then: yup.string().required()
      }),
      token: yup.string().when('provider', {
        is: 'vercel',
        then: yup.string().required()
      })
    })
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateProviderConfig
)