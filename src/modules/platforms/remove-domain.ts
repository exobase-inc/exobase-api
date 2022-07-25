import * as _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import makeBuilder, { BuilderApi } from '../../core/builder'
import model from '../../core/model'
import config from '../../core/config'
import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  domainId: t.Id<'domain'>
  provider: t.CloudProvider
}

interface Services {
  mongo: MongoClient
}

interface Response {
  message: 'success'
}

async function removeDomain({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { workspaceId } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)
  const provider = platform.providers[args.provider] as t.Domainable

  const existingDomain = provider.domains.find(d => d.id === args.domainId)
  if (!existingDomain) {
    throw errors.badRequest({
      details: 'Domain does not exist, cannot be removed',
      key: 'exo.err.platforms.remove-domain.noexisto'
    })
  }

  await mongo.updateWorkspace({
    id: workspaceId,
    workspace: {
      ...workspace,
      platforms: _.replace(workspace.platforms, {
        ...platform,
        providers: {
          ...platform.providers,
          [args.provider]: {
            ...platform.providers[args.provider],
            domains: platform.providers[args.provider].domains.filter(d => d.id !== args.domainId)
          }
        },
      }, p => p.id=== platform.id)
    }
  })

  return {
    message: 'success'
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
    workspaceId: yup.string().required(),
    platformId: yup.string().required(),
    domainId: yup.string().required(),
    provider: yup.string().oneOf(['aws', 'gcp']).required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  removeDomain
)
