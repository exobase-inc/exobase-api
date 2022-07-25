import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import mappers from '../../core/view/mappers'
import dur from 'durhuman'
import { errors, Props } from '@exobase/core'
import { useCors, useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { comparePasswordToHash, createToken } from '../../core/auth'
import { useTokenAuth } from '../../core/hooks/useTokenAuth'
import { TokenAuth } from '@exobase/auth'

interface Args {}

interface Services {
  mongo: MongoClient
}

interface Response {
  user: t.UserView
  workspace: t.WorkspaceView
  idToken: string
  exp: number
}

async function loginOrCreateUser({ services, auth }: Props<Args, Services, TokenAuth>): Promise<Response> {
  const { mongo } = services
  const userId = auth.token.sub as t.Id<'user'>

  const user = await mongo.findUserId({ userId })
  if (!user) {
    throw errors.badRequest({
      details: 'Provided credentials did not match any users',
      key: 'exo.err.auth.refresh.obscured'
    })
  }

  const workspaces = await mongo.findWorkspacesForUser({ userId })
  const firstWorkspace = _.first(workspaces)

  return {
    user: mappers.UserView.toView(user, workspaces),
    workspace: mappers.WorkspaceView.toView(firstWorkspace),
    exp: Math.floor(Date.now() + 1200 * 1000),
    idToken: createToken({
      userId: user.id,
      username: user.username,
      thumbnailUrl: user.thumbnailUrl,
      workspaceId: firstWorkspace.id,
      aud: 'exo.app',
      ttl: dur('20 minutes', 'seconds')
    })
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuth(),
  useService<Services>({
    mongo: makeMongo()
  }),
  loginOrCreateUser
)
