import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  installationId: string
}

interface Services {
  mongo: MongoClient
}

async function addInstallationToPlatform({
  args,
  auth,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { workspaceId } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)

  // TODO: What to do next???
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
    workspaceId: yup.string().required(),
    platformId: yup.string().required(),
    installationId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  addInstallationToPlatform
)
