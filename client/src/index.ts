import api from '@exobase/client-builder'
import * as t from './types'

export { ApiError, ApiResponse, Auth } from '@exobase/client-builder'
export * from './types'


const createApi = (url: string) => {
  const endpoint = api(url)
  return {
    auth: {
      login: endpoint<{
        email: string
        password: string
      }, {
        user: t.User
        workspace: t.Workspace
        idToken: string
        exp: number
      }>({
        module: 'auth',
        function: 'login'
      }),
      signup: endpoint<{
        email: string
        password: string
      }, {
        user: t.User
        workspace: t.Workspace
        idToken: string
        exp: number
      }>({
        module: 'auth',
        function: 'signup'
      }),
      refresh: endpoint<{}, {
        user: t.User
        workspace: t.Workspace
        idToken: string
        exp: number
      }>({
        module: 'auth',
        function: 'refresh'
      }),
      switchWorkspaces: endpoint<{
        workspaceId: string
      }, {
        user: t.User
        workspace: t.Workspace
        idToken: string
        exp: number
      }>({
        module: 'auth',
        function: 'switch-workspaces'
      }),
    },
    workspaces: {
      find: endpoint<{
        workspaceId: string
      }, {
        workspace: t.Workspace
      }>({
        module: 'workspaces',
        function: 'find'
      }),
    },
    deployments: {
      getContext: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
        deploymentId: string
      }, {
        context: t.DeploymentContext
      }>({
        module: 'deployments',
        function: 'get-context'
      }),
      recordOutput: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
        deploymentId: string
        output: any
      }, {}>({
        module: 'deployments',
        function: 'record-output'
      }),
      updateStatus: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
        deploymentId: string
        status: t.DeploymentStatus
      }, {}>({
        module: 'deployments',
        function: 'update-status'
      }),
    },
    platforms: {
      create: endpoint<{
        workspaceId: string
        name: string
      }, {
        platform: t.Platform
      }>({
        module: 'platforms',
        function: 'create'
      }),
      addDomain: endpoint<{
        workspaceId: string
        platformId: string
        domain: string
        provider: t.CloudProvider
      }, {
        domain: t.Domain
      }>({
        module: 'platforms',
        function: 'add-domain'
      }),
      find: endpoint<{
        workspaceId: string
        platformId: string
      }, {
        platform: t.Platform
      }>({
        module: 'platforms',
        function: 'find'
      }),
      updateProvider: endpoint<{
        workspaceId: string
        platformId: string
        provider: t.CloudProvider
        value: t.AWSProvider['auth'] | t.GCPProvider['auth']
      }, {}>({
        module: 'platforms',
        function: 'update-provider'
      })
    },
    units: {
      create: endpoint<{
        name: string
        platformId: string
        workspaceId: string
        tags: {
          name: string
          value: string
        }[]
        packId: string
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
        domainId: null | string
        subdomain: null | string
      }, {
        unit: t.Unit
      }>({
        module: 'units',
        function: 'create'
      }),
      deployFromCLI: endpoint<{
        unitId: string
        platformId: string
        workspaceId: string
      }, {
        deploy: t.Deployment
      }>({
        module: 'units',
        function: 'deploy-via-cli'
      }),
      deployFromUI: endpoint<{
        unitId: string
        platformId: string
        workspaceId: string
      }, {
        deploy: t.Deployment
      }>({
        module: 'units',
        function: 'deploy-via-ui'
      }),
      destroy: endpoint<{
        unitId: string
        platformId: string
        workspaceId: string
      }, {
        deployment: t.Deployment
      }>({
        module: 'units',
        function: 'destroy'
      }),
      getSourceDownloadLink: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
        deploymentId: string
      }, {
        url: string
      }>({
        module: 'units',
        function: 'get-source-download-link'
      }),
      remove: endpoint<{
        unitId: string
        workspaceId: string
        platformId: string
      }, {}>({
        module: 'units',
        function: 'remove'
      }),
      update: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
        name?: string
        tags?: {
          name: string
          value: string
        }[]
        config?: any
        source?: {
          installationId: string | null
          private: boolean
          repoId: string
          owner: string
          repo: string
          branch: string
          provider: 'github'
        }
      }, {
        unit: t.Unit
      }>({
        module: 'units',
        function: 'update'
      }),
      upgradePack: endpoint<{
        workspaceId: string
        platformId: string
        unitId: string
      }, {
        unit: t.Unit
      }>({
        module: 'units',
        function: 'upgrade-pack'
      })
    },
    registry: {
      add: endpoint<{
        url: string
      }, {
        pack: t.BuildPackage
      }>({
        module: 'registry',
        function: 'add'
      }),
      search: endpoint<{
        provider?: t.CloudProvider
        type?: t.ExobaseService
        service?: t.CloudService
        language?: t.Language
      }, {
        packs: t.BuildPackage[]
      }>({
        module: 'registry',
        function: 'search'
      }),
      sync: endpoint<{
        packId: string
      }, {
        pack: t.BuildPackage
      }>({
        module: 'registry',
        function: 'sync'
      }),
    },
    source: {
      addInstallation: endpoint<{
        workspaceId: string
        platformId: string
        installationId: string
      }, {}>({
        module: 'source',
        function: 'add-installation'
      }),
      listBranches: endpoint<{
        workspaceId: string
        platformId: string
        owner: string
        repo: string
        installationId: string | null
      }, {
        branches: {
          name: string
        }[]
      }>({
        module: 'source',
        function: 'add-branches'
      }),
      listRepos: endpoint<{
        workspaceId: string
        platformId: string
      }, {
        repositories: {
          installationId: string
          id: string
          repo: string
          owner: string
        }[]
      }>({
        module: 'source',
        function: 'add-repos'
      }),
    },
    logs: {
      appendChunk: endpoint<{
        logId: string
        timestamp: number
        content: string
      }, {}>({
        module: 'logs',
        function: 'append-chunk'
      }),
      pull: endpoint<{
        logId: string
      }, {
        stream: {
          timestamp: number
          content: string
        }[]
      }>({
        module: 'logs',
        function: 'pull'
      }),
    }
  }
}

export type ExobaseApi = ReturnType<typeof createApi>

export default createApi