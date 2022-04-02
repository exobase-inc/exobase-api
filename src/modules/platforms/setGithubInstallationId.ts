import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  installationId: string
}

interface Services {
  mongo: MongoClient
}

async function setGithubInstallationId({ args, auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { platformId } = auth.token.extra
  const { installationId } = args

  const [err] = await mongo.addPlatformInstallation({
    id: platformId,
    installationId
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
    installationId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  setGithubInstallationId
)