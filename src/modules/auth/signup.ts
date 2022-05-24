import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'
import mappers from '../../core/view/mappers'
import dur from 'durhuman'
import { errors, Props } from '@exobase/core'
import { useCors, useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { createToken, generatePasswordHash } from '../../core/auth'

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

const DEFAULT_USER_THUMBNAIL = 'https://exobase.cloud/default-user-thumbnail.png'

async function loginOrCreateUser({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services

  const [hashError, hash] = await generatePasswordHash(args.password)
  if (hashError) {
    console.error(hashError)
    throw errors.badRequest({
      details: 'Error securly saving your password',
      key: 'exo.err.auth.signup.hash'
    })
  }

  const workspaceId = model.id('workspace')
  const userId = model.id('user')
  const platformId = model.id('platform')
  const username = model.username(args.email)
  const user: t.User = {
    id: userId,
    email: args.email,
    role: 'user',
    username,
    thumbnailUrl: DEFAULT_USER_THUMBNAIL,
    _passwordHash: hash
  }
  const workspace: t.Workspace = {
    id: workspaceId,
    subscription: null,
    name: 'Starter',
    members: [
      {
        userId,
        user: {
          id: userId,
          username,
          thumbnailUrl: DEFAULT_USER_THUMBNAIL
        },
        role: 'owner'
      }
    ],
    platforms: [
      {
        id: platformId,
        name: 'Exobase Default Platform',
        workspaceId,
        workspace: {
          id: workspaceId,
          name: 'Starter'
        },
        units: [],
        providers: {
          aws: {
            auth: null,
            domains: []
          },
          gcp: {
            auth: null,
            domains: []
          }
        },
        sources: [],
        createdAt: Date.now(),
        createdBy: {
          id: userId,
          username: user.username,
          thumbnailUrl: user.thumbnailUrl
        }
      }
    ]
  }
  await mongo.addUser(user)
  await mongo.addWorkspace(workspace)

  return {
    user: mappers.UserView.toView(user, [workspace]),
    workspace: mappers.WorkspaceView.toView(workspace),
    exp: Math.floor(Date.now() + 1200 * 1000),
    idToken: createToken({
      userId: user.id,
      username: user.username,
      thumbnailUrl: user.thumbnailUrl,
      workspaceId: workspace.id,
      aud: 'exo.app',
      ttl: dur('20 minutes', 'seconds')
    })
  }
}

export default _.compose(
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
