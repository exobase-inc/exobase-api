import _ from 'radash'
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
  domain: string
  provider: t.CloudProvider
}

interface Services {
  mongo: MongoClient
  builder: BuilderApi
}

interface Response {
  domain: t.DomainView
}

async function addDomain({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, builder } = services
  const userId = auth.token.sub as t.Id<'user'>
  const { workspaceId, username, thumbnailUrl } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)
  const provider = platform.providers[args.provider] as t.Domainable

  const existingDomain = provider.domains.find(d => d.domain === args.domain)
  if (existingDomain) {
    throw errors.badRequest({
      details: 'Domain already exists',
      key: 'exo.err.platforms.add-domain.allradius'
    })
  }

  if (!provider) {
    throw errors.badRequest({
      details: `Provider (${args.provider}) has not been configured`,
      key: 'exo.err.platforms.add-domain.mellowa'
    })
  }

  const pack = await mongo.findBuildPackage({
    provider: args.provider,
    name: 'exo-domain',
    owner: 'exobase',
    type: 'domain'
  })
  if (!pack) {
    throw errors.notFound({
      details: 'Could not find an internal build package to handle the domain deployment',
      key: 'exo.err.platforms.add-domain.no-build-pack'
    })
  }

  const domainId = model.id('domain')
  const deploymentId = model.id('deploy')
  const unitId = model.id('unit')
  const logId = model.id('log')

  const unit: t.Unit = {
    id: unitId,
    name: `domain: ${args.domain}`,
    platformId: args.platformId,
    workspaceId: args.workspaceId,
    type: 'exo-domain',
    tags: [],
    source: null,
    deployments: [
      {
        id: deploymentId,
        type: 'create',
        logId,
        workspaceId: args.workspaceId,
        platformId: args.platformId,
        unitId,
        status: 'queued',
        startedAt: Date.now(),
        finishedAt: null,
        output: {},
        vars: {
          domain: args.domain
        },
        pack: _.shake({
          ...pack,
          versions: undefined,
          version: pack.versions.find(v => v.version === pack.latest)
        }) as t.BuildPackageRef,
        trigger: {
          type: 'user-ui',
          upload: null,
          user: {
            id: userId,
            username,
            thumbnailUrl
          },
          git: null
        }
      }
    ],
    latestDeployment: null,
    activeDeployment: null,
    domain: null,
    deleted: false,
    pack: _.shake({
      ...pack,
      versions: undefined,
      version: pack.versions.find(v => v.version === pack.latest)
    }) as t.BuildPackageRef,
    attributes: {},
    config: {
      domain: args.domain
    },
    ledger: [
      {
        timestamp: Date.now(),
        event: 'unit-created',
        userId,
        user: {
          id: userId,
          username,
          thumbnailUrl
        },
        snapshot: null
      }
    ],
    createdAt: Date.now(),
    createdBy: {
      id: userId,
      username,
      thumbnailUrl
    }
  }

  const domain: t.Domain = {
    id: domainId,
    workspaceId,
    platformId: args.platformId,
    unitId,
    domain: args.domain,
    provider: args.provider,
    status: 'provisioning',
    addedAt: Date.now(),
    addedBy: {
      id: userId,
      username,
      thumbnailUrl
    }
  }

  await mongo.addLog({
    id: logId,
    deploymentId,
    workspaceId,
    platformId: platform.id,
    unitId,
    stream: []
  })
  await mongo.updateWorkspace({
    id: workspaceId,
    workspace: {
      ...workspace,
      platforms: _.replace(workspace.platforms, {
        ...platform,
        providers: {
          ...platform.providers,
          [args.provider]: {
            ...provider,
            domains: [...provider.domains, domain]
          }
        },
        units: [...platform.units, unit]
      }, p => p.id=== platform.id)
    }
  })

  await builder.trigger.build(
    {
      args: {
        deploymentId: deploymentId,
        workspaceId,
        platformId: platform.id,
        unitId,
        logId
      }
    },
    { key: config.builderApiKey }
  )

  return {
    domain: mappers.DomainView.toView(domain),
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
    domain: yup.string().required(),
    provider: yup.string().oneOf(['aws', 'gcp']).required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    builder: makeBuilder()
  }),
  addDomain
)
