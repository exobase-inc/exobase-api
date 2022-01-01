import api from '@exobase/api'
import * as t from './types'

export { ApiError, ApiResponse, Auth } from '@exobase/api'
export * from './types'


const createApi = (url: string) => {
  const endpoint = api(url)
  return {
    auth: {
      login: endpoint<{}, {
        user: t.User
        platforms: t.PlatformPreview[]
        platformId: string
        idToken: string
        exp: number
      }>({
        module: 'auth',
        function: 'login'
      }),
    },
    deployments: {
      getContext: endpoint<{
        deploymentId: string
      }, {
        context: t.DeploymentContext
      }>({
        module: 'deployments',
        function: 'getContext'
      }),
      listForService: endpoint<{
        serviceId: string
      }, {
        deployments: t.Deployment[]
      }>({
        module: 'deployments',
        function: 'listForService'
      }),
      updateLogs: endpoint<{
        deploymentId: string
        logs: string
      }, {}>({
        module: 'deployments',
        function: 'updateLogs'
      }),
      updateStatus: endpoint<{
        deploymentId: string
        status: t.DeploymentStatus
        source: string
      }, {}>({
        module: 'deployments',
        function: 'updateStatus'
      }),
      updateAttributes: endpoint<{
        deploymentId: string
        attributes: t.DeploymentAttributes
      }, {}>({
        module: 'deployments',
        function: 'updateAttributes'
      })
    },
    domainDeployments: {
      getContext: endpoint<{
        deploymentId: string
      }, {
        context: t.DomainDeploymentContext
      }>({
        module: 'domain-deployments',
        function: 'getContext'
      }),
      getLatest: endpoint<{}, {
        deployments: t.DomainDeployment[]
      }>({
        module: 'domain-deployments',
        function: 'getLatest'
      })
    },
    domains: {
      add: endpoint<{
        domain: string
        provider: t.CloudProvider
      }, {
        deployment: t.DomainDeployment
        domain: t.Domain
      }>({
        module: 'domains',
        function: 'add'
      })
    },
    platforms: {
      getById: endpoint<{
        id: string
      }, {
        platform: t.Platform
      }>({
        module: 'platforms',
        function: 'getById'
      }),
      listForUser: endpoint<{}, {
        platforms: t.Platform[]
      }>({
        module: 'platforms',
        function: 'listForUser'
      }),
      updateProvider: endpoint<{
        provider: t.CloudProvider
        config: t.AWSProviderConfig | t.GCPProviderConfig | t.VercelProviderConfig
      }, {}>({
        module: 'platforms',
        function: 'updateProvider'
      }),
      setGithubInstallationId: endpoint<{
        installationId: string
      }, {}>({
        module: 'platforms',
        function: 'setGithubInstallationId'
      }),
      listAvailableBranches: endpoint<{
        owner: string
        repo: string
        installationId: string | null
      }, {
        branches: {
          name: string
        }[]
      }>({
        module: 'platforms',
        function: 'listAvailableBranches'
      }),
      listAvailableRepositories: endpoint<{}, {
        repositories: {
          installationId: string
          id: string
          repo: string
          owner: string
        }[]
      }>({
        module: 'platforms',
        function: 'listAvailableRepositories'
      })
    },
    services: {
      create: endpoint<{
        name: string
        tags: string[]
        type: t.ExobaseService
        provider: t.CloudProvider
        service: t.CloudService
        language: t.Language
        config: t.ServiceConfig
        source: t.ServiceSource
        domain: {
          domain: string
          subdomain: string
        } | null
      }, {
        service: t.Service
      }>({
        module: 'services',
        function: 'create'
      }),
      update: endpoint<{
        id: string
        name?: string
        tags?: string[]
        type?: t.ExobaseService
        provider?: t.CloudProvider
        service?: t.CloudService
        language?: t.Language
        config?: t.ServiceConfig
        source?: t.ServiceSource
      }, {
        service: t.Service
      }>({
        module: 'services',
        function: 'update'
      }),
      deploy: endpoint<{
        serviceId: string
      }, {
        deployment: t.Deployment
      }>({
        module: 'services',
        function: 'deploy'
      }),
      destroy: endpoint<{
        serviceId: string
      }, {
        deployment: t.Deployment
      }>({
        module: 'services',
        function: 'destroy'
      }),
      remove: endpoint<{
        serviceId: string
      }, {}>({
        module: 'services',
        function: 'remove'
      }),
      listByRepositoryId: endpoint<{
        repositoryId: string
      }, {
        services: t.Service[]
      }>({
        module: 'services',
        function: 'listByRepositoryId'
      }),
      automatedDeploy: endpoint<{
        serviceId: string
        platformId: string
      }, {
        deployment: t.Deployment
      }>({
        module: 'services',
        function: 'automatedDeploy'
      }),
      getSourceDownloadLink: endpoint<{
        serviceId: string
        platformId: string
        deploymentId: string
      }, {
        url: string
      }>({
        module: 'services',
        function: 'getSourceDownloadLink'
      })
    },
  }
}

export type ExobaseApi = ReturnType<typeof createApi>

export default createApi