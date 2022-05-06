export type Model = 'user' | 'workspace' | 'platform' | 'unit' | 'domain' | 'pack' | 'deploy' | 'log'
export type Id<TModel extends Model = Model> = `exo.${TModel}.${string}`
export type Language = 'typescript' | 'javascript' | 'python' | 'swift' | 'csharp' | 'ruby' | 'php' | 'rust' | 'go'
export type CloudProvider = 'aws' | 'gcp'
export type ExobaseService = 'api' | 'app' | 'websocket-server' | 'static-website' | 'task-runner' | 'domain'
export type UserRole = 'user' | 'admin'
export type MemberRole = 'owner' | 'admin' | 'developer' | 'guest'
export type DeploymentStatus = 'queued' | 'canceled' | 'in_progress' | 'success' | 'partial_success' | 'failed'
export type CloudService =
  | 'lambda'
  | 'ec2'
  | 'ecs'
  | 's3'
  | 'cloud-run'
  | 'cloud-function'
  | 'cloud-build'
  | 'code-build'

export type User = {
  _view: 'exo.user'
  id: string
  email: string
  role: UserRole
  username: string
  thumbnailUrl: string
  workspaces: {
    name: string
    id: string
  }[]
}

export type Workspace = {
  _view: 'exo.workspace'
  id: string
  subscription: any // stripe/paddle/chargebee
  name: string
  platforms: Platform[]
  members: {
    user: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
    role: MemberRole
  }[]
}

export type Deployment = {
  _view: 'exo.deployment'
  id: string
  workspaceId: string
  platformId: string
  unitId: string
  logId: string
  type: 'create' | 'destroy'
  startedAt: number
  finishedAt: number | null
  status: DeploymentStatus
  output: any
  vars: any
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

export type Unit = {
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
  deployments: Deployment[]
  latestDeployment: Deployment | null
  activeDeployment: Deployment | null
  hasDeployedInfrastructure: boolean
  hasDeploymentInProgress: boolean
  domain: null | {
    id: string
    domain: string
    subdomain: string
    fqd: string
  }
  deleted: boolean
  pack: BuildPackageRef
  attributes: any
  config: any
  ledger: {
    timestamp: number
    event: 'unit-created' | 'unit-deployed' | 'unit-updated' | 'unit-config-updated' | 'unit-destroyed' | 'unit-deleted'
    user: null | Pick<User, 'id' | 'username' | 'thumbnailUrl'>
  }[]
  createdAt: number
  createdBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
}

export type BuildPackage = {
  _view: 'exo.pack'
  id: string
  name: string
  repo: string
  type: ExobaseService
  provider: CloudProvider
  service: CloudService | null
  language: Language | null
  owner: string
  latest: string
  versions: BuildPackageVersion[]
  addedBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
  addedAt: number
}

export type BuildPackageRef = Omit<BuildPackage, 'versions' | '_view'> & {
  _view: 'exo.pack-ref'
  version: BuildPackageVersion
}

export type PlatformPreview = {
  _view: 'exo.platform-preview'
  id: string
  name: string
}

export type Domain = {
  _view: 'exo.domain'
  id: string
  workspaceId: string
  platformId: string
  unitId: string
  domain: string
  provider: CloudProvider
  status: 'error' | 'ready' | 'provisioning'
}

export type Platform = {
  _view: 'exo.platform'
  id: string
  workspaceId: string
  name: string
  units: Unit[]
  providers: {
    aws: {
      configured: boolean
      region: string
      domains: Domain[]
    }
    gcp: {
      configured: boolean
      domains: Domain[]
    }
  }
  sources: {
    private: boolean
    repoId: string
    owner: string
    repo: string
    provider: 'github'
  }[]
  hasConnectedGithubApp: boolean
  createdBy: Pick<User, 'id' | 'username' | 'thumbnailUrl'>
  createdAt: number
}

export type DeploymentContext = {
  _view: 'exo.deployment.context'
  workspace: Omit<Workspace, 'platforms'>
  provider: AWSProvider | GCPProvider
  platform: Omit<Platform, 'units'>
  unit: Unit
  config: any
  pack: BuildPackageRef
  deployment: Deployment
}

export type AWSProvider = {
  domains: Domain[]
  auth: {
    accessKeyId: string
    accessKeySecret: string
    region: string
  }
}

export type GCPProvider = {
  domains: Domain[]
  auth: {
    jsonCredentials: string
  }
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
  }[]
  outputs: {
    name: string
    description: string
  }[]
}

export type BuildPackageManifest = {
  type?: ExobaseService
  service?: CloudService
  language?: Language
  inputs?: Record<
    string,
    {
      type: 'string' | 'number' | 'envars'
    }
  >
  build?: {
    before?: string
  }
}
