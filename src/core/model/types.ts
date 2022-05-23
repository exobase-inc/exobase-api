//
//  LEGEND
//
//  _ = private, should not be deliverd to client, ever. Internal.
//  $ = nosql non-normal duplication of source record, compressed.
//
//  This convention helps us easily identify internal fields that
//  should never be exposed to the user -- namely in the mappers.
//

export type Model = 'user' | 'workspace' | 'platform' | 'unit' | 'domain' | 'pack' | 'deploy' | 'log'
export type Id<TModel extends Model = Model> = `exo.${TModel}.${string}`
export type Language = 'typescript' | 'javascript' | 'python' | 'swift' | 'csharp' | 'ruby' | 'php' | 'rust' | 'go'
export type CloudProvider = 'aws' | 'gcp'
export type ExobaseService = 'api' | 'app' | 'websocket-server' | 'static-website' | 'task-runner' | 'domain'
export type UserRole = 'user' | 'admin'
export type MemberRole = 'owner' | 'admin' | 'developer' | 'guest'
export type DeploymentStatus = 'queued' | 'canceled' | 'in_progress' | 'success' | 'partial_success' | 'failed'
export type PackConfigUIType = 'string' | 'number' | 'bool' | 'select' | 'multi-select' | 'envars'
export type CloudService =
  | 'lambda'
  | 'ec2'
  | 'ecs'
  | 's3'
  | 'cloud-run'
  | 'cloud-function'
  | 'cloud-build'
  | 'code-build'

export interface User {
  id: Id<'user'>
  email: string
  role: UserRole
  username: string
  thumbnailUrl: string
  _passwordHash: string
}

export interface Domainable {
  domains: Domain[]
}

export interface Authable <TAuth = any> {
  auth: TAuth
}

export type AWSProvider = Domainable & Authable<{
  accessKeyId: string
  accessKeySecret: string
  region: string
} | null>

export type GCPProvider = Domainable & Authable<{
  jsonCredentials: string
} | null>

export interface Domain {
  id: Id<'domain'>
  workspaceId: Id<'workspace'>
  platformId: Id<'platform'>
  unitId: Id<'unit'>
  domain: string
  provider: CloudProvider
  status: 'error' | 'ready' | 'provisioning'
  addedAt: number
  addedBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
}

export interface Workspace {
  id: Id<'workspace'>
  subscription: any // stripe/paddle/chargebee
  name: string
  platforms: Platform[]
  members: {
    userId: Id<'user'>
    user: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
    role: MemberRole
  }[]
}

export interface Platform {
  id: Id<'platform'>
  workspaceId: Id<'workspace'>
  workspace: Pick<Workspace, 'id' | 'name'>
  name: string
  units: Unit[]
  providers: {
    aws: AWSProvider
    gcp: GCPProvider
  }
  sources: {
    _installationId: string | null
    private: boolean
    repoId: string
    owner: string
    repo: string
    provider: 'github'
  }[]
  createdBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
  createdAt: number
}

export interface Unit {
  id: Id<'unit'>
  name: string
  platformId: Id<'platform'>
  workspaceId: Id<'workspace'>
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
  deployments: Deployment[]
  latestDeployment: Deployment | null
  activeDeployment: Deployment | null
  domain: DomainRef | null
  deleted: boolean
  pack: BuildPackageRef
  attributes: any // Shape determined by build pack input
  config: any // Shape determined by build pack input
  ledger: {
    timestamp: number
    event: 'unit-created' | 'unit-deployed' | 'unit-updated' | 'unit-config-updated' | 'unit-destroyed' | 'unit-deleted'
    userId: null | Id<'user'>
    user: null | Pick<User, 'id' | 'username' | 'thumbnailUrl'>
    snapshot: Omit<Unit, 'ledger' | 'deployments'>
  }[]
  createdBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
  createdAt: number
}

export interface Deployment {
  id: Id<'deploy'>
  type: 'create' | 'destroy'
  logId: Id<'log'>
  workspaceId: Id<'workspace'>
  platformId: Id<'platform'>
  unitId: Id<'unit'>
  status: DeploymentStatus
  startedAt: number
  finishedAt: number | null
  output: any
  vars: any
  pack: BuildPackageRef
  trigger: {
    type: 'user-ui' | 'user-cli' | 'github-push'
    user: null | Pick<User, 'id' | 'username' | 'thumbnailUrl'>
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

export type LogStream = {
  content: string
  timestamp: number
}[]

export type Log = {
  id: Id<'log'>
  deploymentId: Id<'deploy'>
  workspaceId: Id<'workspace'>
  platformId: Id<'platform'>
  unitId: Id<'unit'>
  stream: LogStream
}

export interface BuildPackage {
  id: Id<'pack'>
  name: string
  repo: string
  type: ExobaseService
  provider: CloudProvider
  service: CloudService | null
  language: Language | null
  owner: string
  namespace: string
  latest: string
  versions: BuildPackageVersion[]
  url: string
  addedBy: Pick<User, 'id' | 'email' | 'username' | 'thumbnailUrl'>
  addedAt: number
}

export type BuildPackConfigOption = {
  info: string
  value: string
}

export interface BuildPackageVersion {
  version: string
  source: string
  publishedAt: number
  manifest: BuildPackageManifest
  readme: string
  inputs: {
    name: string
    type: string
    description: string
    default: string
    required: boolean
    ui: PackConfigUIType
    label: string
    options: null | BuildPackConfigOption[]
    placeholder: null | string
  }[]
  outputs: {
    name: string
    description: string
  }[]
}

export type BuildPackageRef = Omit<BuildPackage, 'versions'> & {
  version: BuildPackageVersion
}

export type BuildPackageManifest = {
  type?: ExobaseService
  service?: CloudService
  language?: Language
  inputs?: Record<
    string,
    {
      ui?: PackConfigUIType
      label?: string
      options?: BuildPackConfigOption[]
      placeholder?: string
    }
  >
  build?: {
    before?: string
  }
}

export type DomainRef = Domain & {
  subdomain: string | null
  fqd: string | null
}
