
//
//  LEGEND
//
//  _ = private, should not be deliverd to client, ever, internal
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
}

export type Language = 'typescript'
  | 'javascript'
  | 'python'
  | 'swift'

export type CloudProvider = 'aws'
  | 'gcp'
  | 'vercel'
  | 'azure'
  | 'netlify'
  | 'ibm'

export type CloudService = 'lambda'
  | 'ec2'
  | 'ecs'
  | 'cloud-run'
  | 'cloud-function'

export type ExobaseService = 'api'
  | 'app'
  | 'webhook-server'

export type ServiceKey = `${ExobaseService}:${CloudProvider}:${CloudService}:${Language}`

export type MembershipAccessLevl = 'owner'
  | 'developer'
  | 'auditor'

export interface Membership {
  id: string
  userId: string
  platformId: string
  environmentId: string
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

export interface Platform {
  id: string
  name: string
  services: Service[]
  membership: Membership[]
  environments: Environment[]
  providers: {
    aws?: AWSProviderConfig
    gcp?: GCPProviderConfig
    vercel?: VercelProviderConfig
  }
}

export interface Environment {
  id: string
  name: string
  platformId: string
}

export interface Service {
  id: string
  name: string
  platformId: string
  provider: CloudProvider
  service: CloudService
  type: ExobaseService
  language: Language
  source: {
    repository: string
    branch: string
  }
  key: ServiceKey
  instances: ServiceInstance[]
}

export interface ServiceInstance {
  id: string
  environmentId: string
  serviceId: string
  mute: boolean
  config: {
    type: `${CloudProvider}:${CloudService}`
  } & Record<string, any>
  deployments: Deployment[]
  attributes: Record<string, string | number>
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

export interface Deployment {
  id: string
  platformId: string
  serviceId: string
  environmentId: string
  logs: string
  gitCommitId: string | null
  ledger: DeploymentLedgerItem[]
}