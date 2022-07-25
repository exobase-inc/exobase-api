import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import mappers from '../../core/view/mappers'
import model from '../../core/model'

import type { Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  name: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  platform: t.PlatformView
}

async function createPlatform({ services, args, auth }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const userId = auth.token.sub as t.Id<'user'>
  const { workspaceId, username, thumbnailUrl } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)

  const platformId = model.id('platform')
  const platform: t.Platform = {
    id: platformId,
    workspaceId,
    workspace: {
      id: workspace.id,
      name: workspace.name
    },
    name: args.name,
    units: [],
    providers: {
      aws: null,
      gcp: null
    },
    sources: [],
    createdBy: {
      id: userId,
      username,
      thumbnailUrl
    },
    createdAt: Date.now()
  }

  await mongo.updateWorkspace({
    id: workspace.id,
    workspace: {
      ...workspace,
      platforms: [...workspace.platforms, platform]
    }
  })

  return {
    platform: mappers.PlatformView.toView(platform)
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs<Args>(yup => ({
    workspaceId: yup.string().required(),
    name: yup.string().required()
  })),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo()
  }),
  createPlatform
)
