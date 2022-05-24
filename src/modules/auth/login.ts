import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import mappers from '../../core/view/mappers'
import dur from 'durhuman'
import { errors, Props } from '@exobase/core'
import { useCors, useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { comparePasswordToHash, createToken } from '../../core/auth'

interface Args {
  email: string
  password: string
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

async function loginOrCreateUser({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services

  const user = await mongo.findUserByEmail({ email: args.email })
  if (!user) {
    throw errors.badRequest({
      details: 'Provided credentials did not match any users',
      key: 'exo.err.auth.login.obscured'
    })
  }

  const [hashError, isMatch] = await comparePasswordToHash(args.password, user._passwordHash)

  if (hashError || !isMatch) {
    if (hashError) console.error(hashError)
    throw errors.badRequest({
      details: 'Provided credentials did not match any users',
      key: 'exo.err.auth.login.obscured'
    })
  }

  const workspaces = await mongo.findWorkspacesForUser({ userId: user.id })
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
  (func) => (...args: any) => {
    console.error(args)
    return func(...args)
  },
  useLambda(),
  useCors(),
  useJsonArgs(yup => ({
    email: yup.string().email().required(),
    password: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  loginOrCreateUser
)
