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
  provider: t.CloudProvider
  value: t.AWSProvider['auth'] | t.GCPProvider['auth']
}

interface Services {
  mongo: MongoClient
}

async function updateProviderConfig({
  args,
  auth,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { workspaceId } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)

  await mongo.updateWorkspace({
    id: workspace.id,
    workspace: {
      ...workspace,
      platforms: _.replace(
        workspace.platforms,
        {
          ...platform,
          providers: {
            ...platform.providers,
            [args.provider]: {
              ...platform.providers[args.provider],
              auth: args.value
            }
          }
        },
        p => p.id === args.platformId
      )
    }
  })
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
    provider: yup.string().oneOf(['aws', 'gcp']).required(),
    value: yup.object({
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
      })
    })
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateProviderConfig
)
