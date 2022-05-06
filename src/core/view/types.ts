import * as t from '../model/types'

// These are the types that are returned to the frontend
// We add _view to each one so the type never matches the
// model type. Ex. User { id } UserView { id } would not
// error if we returned an instance of the user because all
// attributes exist. _view makes sure we see errors for this.
// Its also potentially helpful for systems parsing the objects
// to know with certaintly what the shape is.

export type UserView = {
  _view: 'exo.user',
  id: string
  email: string
  role: t.UserRole
  username: string
  thumbnailUrl: string
  workspaces: {
    name: string
    id: string
  }[]
}

export type WorkspaceView = {
  _view: 'exo.workspace'
  id: string
  subscription: any // stripe/paddle/chargebee
  name: string
  platforms: PlatformView[]
  members: {
    user: Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
    role: t.MemberRole
  }[]
}

export type DeploymentView = {
  _view: 'exo.deployment'
  id: string
  workspaceId: string
  platformId: string
  unitId: string
  logId: string
  type: 'create' | 'destroy'
  startedAt: number
  finishedAt: number | null
  status: t.DeploymentStatus
  output: any
  vars: any
  trigger: {
    type: 'user-ui' | 'user-cli' | 'github-push'
    user: null | Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
    git: null | {
      commit: string
      private: boolean
      repoId: string
      owner: string
      repo: string
      branch: string
    }
  }
}

export type UnitView = {
  _view: 'exo.unit'
  id: string
  name: string
  platformId: string
  workspaceId: string
  type: 'user-service' | 'exo-domain'
  tags: {
    name: string
    value: string
  }[]
  source: null | {
    private: boolean
    repoId: string
    owner: string
    repo: string
    branch: string
    provider: 'github'
  }
  deployments: DeploymentView[]
  latestDeployment: DeploymentView | null
  activeDeployment: DeploymentView | null
  hasDeployedInfrastructure: boolean
  hasDeploymentInProgress: boolean
  domain: null | {
    id: string
    domain: string
    subdomain: string
    fqd: string
  }
  deleted: boolean
  pack: BuildPackageRefView
  attributes: any
  config: any
  ledger: {
    timestamp: number
    event: 'unit-created' | 'unit-deployed' | 'unit-updated' | 'unit-config-updated' | 'unit-destroyed' | 'unit-deleted'
    user: null | Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
  }[]
  createdAt: number
  createdBy: Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
}

export type BuildPackageView = {
  _view: 'exo.pack'
  id: string
  name: string
  repo: string
  type: t.ExobaseService
  provider: t.CloudProvider
  service: t.CloudService | null
  language: t.Language | null
  owner: string
  latest: string
  versions: t.BuildPackageVersion[]
  addedBy: Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
  addedAt: number
}

export type BuildPackageRefView = Omit<BuildPackageView, 'versions' | '_view'> & {
  _view: 'exo.pack-ref'
  version: t.BuildPackageVersion
}

export type PlatformPreviewView = {
  _view: 'exo.platform-preview'
  id: string
  name: string
}

export type DomainView = {
  _view: 'exo.domain'
  id: string
  workspaceId: string
  platformId: string
  unitId: string
  domain: string
  provider: t.CloudProvider
  status: 'error' | 'ready' | 'provisioning'
}

export type PlatformView = {
  _view: 'exo.platform'
  id: string
  workspaceId: string
  name: string
  units: UnitView[]
  providers: {
    aws: {
      configured: boolean
      region: string
      domains: DomainView[]
    }
    gcp: {
      configured: boolean
      domains: DomainView[]
    }
  },
  sources: {
    private: boolean
    repoId: string
    owner: string
    repo: string
    provider: 'github'
  }[]
  hasConnectedGithubApp: boolean
  createdBy: Pick<UserView, 'id' | 'username' | 'thumbnailUrl'>
  createdAt: number
}

export type DeploymentContextView = {
  _view: 'exo.deployment.context'
  workspace: Omit<WorkspaceView, 'platforms'>
  provider: t.AWSProvider | t.GCPProvider
  platform: Omit<PlatformView, 'units'>
  unit: UnitView
  config: any
  pack: BuildPackageRefView
  deployment: DeploymentView
}