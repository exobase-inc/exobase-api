import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import config from '../../core/config'
import { Props, errors } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  name: string
  platformId: t.Id<'platform'>
  workspaceId: t.Id<'workspace'>
  tags: {
    name: string
    value: string
  }[]
  packId: t.Id<'pack'>
  packConfig: any
  source: null | {
    installationId: string | null
    private: boolean
    repoId: string
    owner: string
    repo: string
    branch: string
    provider: 'github'
  }
  domainId: null | t.Id<'domain'>
  subdomain: null | string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  unit: t.UnitView
}

//
//  TODO: Check user roles & permissions in workspace
//  before creating the unit of infrastructure.
//

async function createService({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { workspaceId, thumbnailUrl, username } = auth.token.extra
  const userId = auth.token.sub as t.Id<'user'>

  if (args.workspaceId !== workspaceId) {
    throw errors.badRequest({
      details: 'Cannot create a unit of infrastructure in a workspace you are not currently authenticated with',
      key: 'exo.err.units.create.workspace-mismatch'
    })
  }

  const workspace = await mongo.findWorkspaceById(workspaceId)
  if (!workspace) {
    throw errors.notFound({
      details: 'Could not find a workspace matching the current session',
      key: 'exo.err.units.create.no-workspace'
    })
  }

  const platform = workspace.platforms.find(p => p.id === args.platformId)
  if (!platform) {
    throw errors.notFound({
      details: 'Could not find a platform matching the given id',
      key: 'exo.err.units.create.no-platform'
    })
  }

  const pack = await mongo.findBuildPackageById({ id: args.packId })
  if (!pack) {
    throw errors.notFound({
      details: 'Could not find a build package matching the given id',
      key: 'exo.err.units.create.no-build-pack'
    })
  }

  const provider = platform.providers[pack.provider] as t.Domainable
  if (!provider) {
    throw errors.badRequest({
      details: 'The provider for the selected build pack has not been configured in the selected platform',
      key: 'exo.err.units.create.no-provider'
    })
  }

  const domain: t.DomainRef = (() => {
    if (!args.domainId) return null
    const d = provider.domains.find(d => d.id === args.domainId)
    if (!d) {
      throw errors.notFound({
        details: 'Could not find the domain specified',
        key: 'exo.err.units.create.nodom'
      })
    }
    if (d.status === 'error') {
      throw errors.badRequest({
        details: 'Cannot use a domain that is in an error state',
        key: 'exo.err.units.create.domain-error'
      })
    }
    if (d.status === 'provisioning') {
      throw errors.badRequest({
        details: 'Cannot use a domain that is in a provisioning state',
        key: 'exo.err.units.create.domain-provisioning'
      })
    }
    return {
      ...d,
      subdomain: args.subdomain,
      fqd: args.subdomain ? `${args.subdomain}.${d.domain}` : null
    }
  })()

  const id = model.id('unit')
  const unit: t.Unit = {
    id,
    type: 'user-service',
    name: args.name,
    tags: args.tags,
    platformId: args.platformId,
    workspaceId: workspaceId,
    deployments: [],
    latestDeployment: null,
    activeDeployment: null,
    pack: _.shake({
      ...pack,
      versions: undefined,
      version: pack.versions.find(v => v.version === pack.latest)
    }) as t.BuildPackageRef,
    config: args.packConfig,
    attributes: null,
    ledger: [{
      timestamp: Date.now(),
      event: 'unit-created',
      userId,
      user: {
        id: userId,
        username,
        thumbnailUrl
      },
      snapshot: null
    }],
    source: args.source ? {
      private: args.source.private,
      repoId: args.source.repoId,
      owner: args.source.owner,
      repo: args.source.repo,
      branch: args.source.branch,
      provider: 'github'
    } : null,
    domain,
    deleted: false,
    createdAt: Date.now(),
    createdBy: {
      id: userId,
      username,
      thumbnailUrl
    }
  }

  const newWorkspace: t.Workspace = {
    ...workspace,
    platforms: _.replace(workspace.platforms, {
      ...platform,
      sources: args.source ? platform.sources.find(s => s.repoId === args.source.repoId) ? platform.sources : [
        ...platform.sources,
        {
          _installationId: args.source.installationId,
          private: args.source.private,
          repoId: args.source.repoId,
          owner: args.source.owner,
          repo: args.source.repo,
          provider: 'github'
        }
      ] : platform.sources,
      units: [...platform.units, unit ]
    }, p => p.id === platform.id)
  }
  await mongo.updateWorkspace({
    id: workspaceId,
    workspace: newWorkspace
  })

  return {
    unit: mappers.UnitView.toView(unit)
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
    name: yup.string().required(),
    platformId: yup
      .string()
      .matches(/^exo\.platform\.[a-z0-9]+$/)
      .required(),
    workspaceId: yup
      .string()
      .matches(/^exo\.workspace\.[a-z0-9]+$/)
      .required(),
    tags: yup
      .array()
      .of(
        yup.object({
          name: yup.string().required(),
          value: yup.string().required()
        })
      )
      .required(),
    packId: yup
      .string()
      .matches(/^exo\.pack\.[a-z0-9]+$/)
      .required(),
    packConfig: yup.mixed(),
    source: yup
      .object({
        installationId: yup.string().nullable(),
        private: yup.boolean(),
        repoId: yup.string().required(),
        owner: yup.string().required(),
        repo: yup.string().required(),
        branch: yup.string().required(),
        provider: yup.string().oneOf(['github'])
      })
      .nullable(),
    subdomain: yup.string().matches(/^[a-z][a-z\-]+[a-z]$/, 'Subdomain can only contain letters and dashes and must start and end with a letter').nullable(),
    domainId: yup
      .string()
      .matches(/^exo\.domain\.[a-z0-9]+$/)
      .nullable()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  createService
)
