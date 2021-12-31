
export type UserAccessControlLevel = 'user' | 'admin'

export type Language = 'typescript'
  | 'javascript'
  | 'python'
  | 'swift'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'rust'
  | 'go'

export type CloudProvider = 'aws'
  | 'gcp'
  | 'vercel'
  | 'azure'
  | 'netlify'
  | 'ibm'
  | 'heroku'

export type CloudService = 'lambda'
  | 'ec2'
  | 'ecs'
  | 'cloud-run'
  | 'cloud-function'

export type ExobaseService = 'api'
  | 'app'
  | 'websocket-server'

export type StackKey = `${ExobaseService}:${CloudProvider}:${CloudService}:${Language}`
export type ExobaseServiceKey = `${ExobaseService}:${CloudProvider}:${CloudService}`

export type MembershipAccessLevl = 'owner'
  | 'developer'
  | 'auditor'

export interface Membership {
  id: string
  userId: string
  platformId: string
  acl: MembershipAccessLevl
}

export type VercelProviderConfig = {
  token: string
}

export type AWSProviderConfig = {
  accessKeyId: string
  accessKeySecret: string
  region: string
}

export type GCPProviderConfig = {
  jsonCredentials: string
}

export type HerokuProviderConfig = {

}

export type DeploymentStatus = 'queued'
  | 'canceled'
  | 'in_progress'
  | 'success'
  | 'partial_success'
  | 'failed'

export interface DeploymentLedgerItem {
  status: DeploymentStatus
  timestamp: number
  source: string
}

export interface ExobaseFunction {
  module: string
  function: string
}

export interface RepositoryServiceLookupItem {
  id: string
  repositoryId: string
  serviceId: string
  platformId: string
}

// These are the types that are returned to the frontend
// We add _view to each one so the type never matches the
// model type. Ex. User { id } UserView { id } would not
// error if we returned an instance of the user because all
// attributes exist. _view makes sure we see errors for this.
// Its also potentially helpful for systems parsing the objects
// to know with certaintly what the shape is.

export type User = {
  _view: 'exo.user',
  id: string
  did: string
  email: string
  acl: UserAccessControlLevel
  username: string
}

export interface DeploymentAttributes {
  functions: ExobaseFunction[]
  version: string
  url: string
  outputs: Record<string, string | number | boolean>
}

export type Deployment = {
  _view: 'exo.deployment'
  id: string
  platformId: string
  serviceId: string
  startedAt: number
  finishedAt: number | null
  status: DeploymentStatus
  ledger: DeploymentLedgerItem[]
  logs: string
  attributes: DeploymentAttributes | null
  config: ServiceConfig
  trigger: DeploymentTrigger
}

export interface DeploymentTrigger {
  type: 'user' | 'source'
  user?: {
    id: string
    username: string
  }
  source?: ServiceSource
}

export type DomainDeployment = {
  _view: 'exo.domain-deployment'
  id: string
  platformId: string
  domainId: string
  startedAt: number
  finishedAt: number | null
  status: DeploymentStatus
  ledger: DeploymentLedgerItem[]
  logs: string
}

export type ServiceDomainConfig = {
  subdomain: string
  domain: string
  fqd: string
}

export interface ServiceSource {
  installationId: string | null
  private: boolean
  repoId: string
  owner: string
  repo: string
  branch: string
  provider: 'github' | 'bitbucket' | 'gitlab'
}

export interface EnvironmentVariable {
  name: string
  value: string
  isSecret: boolean
}

export type ServiceConfig = {
  type: ExobaseServiceKey
  environmentVariables: EnvironmentVariable[]
  stack: Record<string, string | boolean | number>
}

export type Service = {
  _view: 'exo.service'
  id: string
  name: string
  platformId: string
  provider: CloudProvider
  service: CloudService
  type: ExobaseService
  language: Language
  source: ServiceSource
  key: StackKey
  tags: string[]
  deployments: Deployment[]
  latestDeploymentId: string | null
  latestDeployment: Deployment | null
  config: ServiceConfig
  domain: ServiceDomainConfig | null
}

export type PlatformPreview = {
  _view: 'exo.platform-preview'
  id: string
  name: string
}

export type Domain = {
  _view: 'exo.domain'
  id: string
  platformId: string
  domain: string
  provider: CloudProvider
  latestDeploymentId: string | null
}

export type Platform = {
  _view: 'exo.platform'
  id: string
  name: string
  services: Service[]
  hasConnectedGithubApp: boolean
  domains: Domain[]
  providers: {
    aws: {
      accessKeyId: '***************' | null
      accessKeySecret: '***************' | null
      region: string
      configured: boolean
    }
    gcp: GCPProviderConfig & {
      configured: boolean
    }
    vercel: VercelProviderConfig & {
      configured: boolean
    }
    heroku: HerokuProviderConfig & {
      configured: boolean
    }
  }
}

export type ElevatedPlatform = Omit<Platform, '_view' | 'providers'> & {
  _view: 'exo.platform.elevated'
  providers: {
    aws?: AWSProviderConfig
    gcp?: GCPProviderConfig
    vercel?: VercelProviderConfig
    heroku?: HerokuProviderConfig
  }
}

export type DomainDeploymentContext = {
  _view: 'exo.domain-deployment.context'
  platform: Omit<ElevatedPlatform, 'services'>
  domain: Domain
  deployment: DomainDeployment
}

export type DeploymentContext = {
  _view: 'exo.deployment.context'
  platform: Omit<ElevatedPlatform, 'services'>
  service: Service
  deployment: Deployment
}