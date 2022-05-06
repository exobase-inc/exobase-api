import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'
import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
}

interface Services {
  mongo: MongoClient
}

interface Response {
  workspace: t.WorkspaceView
}

async function findWorkspace({ services, auth, args }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { workspaceId } = auth.token.extra
  const workspace = await mongo.findWorkspaceById(workspaceId)
  return {
    workspace: mappers.WorkspaceView.toView(workspace)
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
    workspaceId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  findWorkspace
)
