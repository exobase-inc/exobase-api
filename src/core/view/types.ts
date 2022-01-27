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
  did: string
  email: string
  acl: t.UserAccessControlLevel
  username: string
}

export type DeploymentView = {
  _view: 'exo.deployment'
  id: string
  type: 'create' | 'destroy'
  platformId: string
  serviceId: string
  startedAt: number
  finishedAt: number | null
  status: t.DeploymentStatus
  ledger: t.DeploymentLedgerItem[]
  logs: string
  attributes: t.DeploymentAttributes
  config: t.ServiceConfig
  trigger: t.DeploymentTrigger
}

export type DomainDeploymentView = {
  _view: 'exo.domain-deployment'
  id: string
  platformId: string
  domainId: string
  startedAt: number
  finishedAt: number | null
  status: t.DeploymentStatus
  ledger: t.DeploymentLedgerItem[]
  logs: string
}

export type ServiceView = {
  _view: 'exo.service'
  id: string
  name: string
  platformId: string
  provider: t.CloudProvider
  service: t.CloudService
  type: t.ExobaseService
  language: t.Language
  source: t.ServiceSource
  stack: t.StackKey
  tags: string[]
  deployments: DeploymentView[]
  latestDeploymentId: string | null
  latestDeployment: DeploymentView | null
  activeDeploymentId: string | null
  activeDeployment: DeploymentView | null
  config: t.ServiceConfig
  domain: t.ServiceDomainConfig | null
  hasDeployedInfrastructure: boolean
  hasDeploymentInProgress: boolean
  isDeleted: boolean
  deleteEvent: t.DeleteEvent | null
  createdAt: number
  buildPack: t.BuildPack
}

export type PlatformPreviewView = {
  _view: 'exo.platform-preview'
  id: string
  name: string
}

export type DomainView = {
  _view: 'exo.domain'
  id: string
  platformId: string
  domain: string
  provider: t.CloudProvider
  latestDeploymentId: string | null
  buildPack: t.BuildPack
}

export type PlatformView = {
  _view: 'exo.platform'
  id: string
  name: string
  services: ServiceView[]
  providers: {
    aws: {
      accessKeyId: '***************' | null
      accessKeySecret: '***************' | null
      region: string
      configured: boolean
    }
    gcp: t.GCPProviderConfig & {
      configured: boolean
    }
    vercel: t.VercelProviderConfig & {
      configured: boolean
    }
    heroku: t.HerokuProviderConfig & {
      configured: boolean
    }
  },
  domains: DomainView[],
  hasConnectedGithubApp: boolean
}

export type ElevatedPlatformView = Omit<PlatformView, '_view' | 'providers'> & {
  _view: 'exo.platform.elevated'
  providers: {
    aws?: t.AWSProviderConfig
    gcp?: t.GCPProviderConfig
    vercel?: t.VercelProviderConfig
    heroku?: t.HerokuProviderConfig
  }
}

export type DomainDeploymentContextView = {
  _view: 'exo.domain-deployment.context'
  platform: Omit<ElevatedPlatformView, 'services'>
  domain: DomainView
  deployment: DomainDeploymentView
}

export type DeploymentContextView = {
  _view: 'exo.deployment.context'
  platform: Omit<ElevatedPlatformView, 'services'>
  service: ServiceView
  deployment: DeploymentView
}