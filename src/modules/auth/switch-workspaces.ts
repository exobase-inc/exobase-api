import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import dur from 'durhuman'
import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { createToken } from '../../core/auth'
import mappers from '../../core/view/mappers'

interface Args {
  workspaceId: t.Id<'workspace'>
}

interface Services {
  mongo: MongoClient
}

interface Response {
  user: t.UserView
  workspace: t.WorkspaceView
  idToken: string
  exp: number
}

async function switchWorkspaces({
  services,
  args,
  auth
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { username, thumbnailUrl } = auth.token.extra
  const userId = auth.token.sub as t.Id<'user'>

  const user = await mongo.findUserId({ userId })
  const workspaces = await mongo.findWorkspacesForUser({ userId })
  const workspace = workspaces.find(w => w.id === args.workspaceId)
  const membership = workspace.members.find(m => m.userId === userId)

  if (!membership) {
    throw errors.forbidden({
      details: 'User does not have acess to the specified workspace',
      key: 'exo.err.auth.switch-workspaces.no-access'
    })
  }

  return {
    user: mappers.UserView.toView(user, workspaces),
    workspace: mappers.WorkspaceView.toView(workspace),
    exp: Math.floor(Date.now() + dur('20 minutes', 'milliseconds')),
    idToken: createToken({
      userId,
      username,
      thumbnailUrl,
      workspaceId: workspace.id,
      aud: 'exo.app',
      ttl: dur('20 minutes', 'seconds')
    })
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
    workspaceId: yup
      .string()
      .matches(/^exo\.workspace\.[a-z0-9]+$/)
      .required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  switchWorkspaces
)
