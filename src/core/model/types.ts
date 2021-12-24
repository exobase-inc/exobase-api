
//
//  LEGEND
//
//  _ = private, should not be deliverd to client, ever. Internal
//  $ = nosql non-normal duplication of source record, compressed
//
//  This convention helps us easily identify internal fields that
//  should never be exposed to the user -- namely in the mappers.
//

export type UserAccessControlLevel = 'user' | 'admin'

export interface User {
  id: string
  did: string
  email: string
  acl: UserAccessControlLevel
  // subscription: Subscription
  // _stripeCustomerId: string
  // teams: string[]
}

export interface Team {
  id: string
  name: string
  members: {
    user: User
    type: 'owner' | 'admin' | 'member'
  }[]
  platforms: string[]
}

export type SubscriptionEvent = 'subscription.canceled'
  | 'subscription.started'
  | 'subscription.paused'
  | 'payment.failed'
  | 'payment.success'

export interface Subscription {
  id: string
  ownerId: string
  userId: string
  planId: string
  start: number
  end: number
  rate: 'monthly' | 'yearly'
  type: 'individual' | 'team'
  ledger: {
    timestamp: number
    event: SubscriptionEvent
    snapshot: Omit<Subscription, 'ledger'> | null
  }[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  isTeam: boolean
  seats: number
  rates: {
    monthly: number
    yearly: number
  }
}

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

export interface Domain {
  id: string
  platformId: string
  domain: string
  provider: CloudProvider
  latestDeploymentId: string | null
  deployments: DomainDeployment[]
}

export interface Platform {
  id: string
  name: string
  services: Service[]
  membership: Membership[]
  providers: {
    aws?: AWSProviderConfig
    gcp?: GCPProviderConfig
    vercel?: VercelProviderConfig
  }
  domains: Domain[]
  _githubInstallations: {
    id: string
  }[]
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

export interface Service {
  id: string
  name: string
  platformId: string
  provider: CloudProvider
  service: CloudService
  type: ExobaseService
  language: Language
  key: StackKey
  source: ServiceSource
  tags: string[]
  deployments: Deployment[]
  latestDeploymentId: string | null
  latestDeployment: Deployment | null
  config: {
    type: ExobaseServiceKey
  } & Record<string, any>
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

export interface DomainDeployment {
  id: string
  platformId: string
  domainId: string
  logs: string
  ledger: DeploymentLedgerItem[]
}

export interface Deployment {
  id: string
  platformId: string
  serviceId: string
  logs: string
  gitCommitId: string | null
  ledger: DeploymentLedgerItem[]
  functions: ExobaseFunction[]
  attributes: Record<string, string | number | boolean>
  config: {
    type: ExobaseServiceKey
  } & Record<string, any>
}

export interface RepositoryServiceLookupItem {
  repositoryId: string
  serviceId: string
  platformId: string
}