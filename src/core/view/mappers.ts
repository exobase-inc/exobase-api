import * as t from '../types'
import _ from 'radash'

export class UserView {
  static fromUser(user: t.User): t.UserView {
    return {
      _view: 'exo.user',
      id: user.id,
      did: user.did,
      email: user.email,
      acl: user.acl,
      username: user.username
    }
  }
}

export class PlatformPreviewView {
  static fromPlatform(platform: t.Platform): t.PlatformPreviewView {
    return {
      _view: 'exo.platform-preview',
      id: platform.id,
      name: platform.name
    }
  }
}

export class DomainView {
  static fromDomain(domain: t.Domain): t.DomainView {
    return {
      _view: 'exo.domain',
      id: domain.id,
      platformId: domain.platformId,
      domain: domain.domain,
      provider: domain.provider,
      latestDeploymentId: domain.latestDeploymentId,
      pack: domain.pack
    }
  }
}

export class PlatformView {
  static fromPlatform(platform: t.Platform): t.PlatformView {
    return {
      _view: 'exo.platform',
      id: platform.id,
      name: platform.name,
      services: (platform.services ?? []).filter(s => !s.isDeleted).map(ServiceView.fromService),
      providers: {
        aws: {
          accessKeyId: platform.providers.aws?.accessKeyId ? '***************' : null,
          accessKeySecret: platform.providers.aws?.accessKeySecret ? '***************' : null,
          region: platform.providers.aws?.region,
          configured: !!platform.providers.aws
        },
        gcp: {
          jsonCredentials: platform.providers.gcp?.jsonCredentials ? '***********' : null,
          configured: !!platform.providers.gcp
        },
        vercel: {
          token: platform.providers.vercel?.token ? '***********' : null,
          configured: !!platform.providers.vercel
        },
        heroku: {
          configured: false
        }
      },
      domains: platform.domains.map(DomainView.fromDomain),
      hasConnectedGithubApp: platform._githubInstallations.length > 0
    }
  }
}

export class ElevatedPlatformView {
  static fromPlatform(platform: t.Platform): t.ElevatedPlatformView {
    return {
      ...PlatformView.fromPlatform(platform),
      _view: 'exo.platform.elevated',
      providers: platform.providers
    }
  }
}

export class ServiceView {
  static fromService(service: t.Service): t.ServiceView {
    const latestDeployment = service.latestDeployment
      ? DeploymentView.fromDeployment(service.latestDeployment)
      : null
    const activeDeployment = service.activeDeployment
      ? DeploymentView.fromDeployment(service.activeDeployment)
      : null
    const inProgressStatuses: t.DeploymentStatus[] = ['in_progress', 'queued']
    const hasDeploymentInProgress = inProgressStatuses.includes(latestDeployment?.status)
    return {
      _view: 'exo.service',
      id: service.id,
      name: service.name,
      platformId: service.platformId,
      stackName: service.stackName,
      source: service.source,
      tags: service.tags,
      deployments: (service.deployments ?? []).map(DeploymentView.fromDeployment),
      latestDeploymentId: service.latestDeployment?.id ?? null,
      activeDeploymentId: service.activeDeployment?.id ?? null,
      latestDeployment,
      activeDeployment,
      hasDeploymentInProgress,
      hasDeployedInfrastructure: (() => {
        // If there is no currently active infrastructure but there
        // is a latest deployment and that latest deployment was a
        // destory and it was successful then there is no deployed
        // infrastructure -- return false
        if (
          !activeDeployment && 
          latestDeployment?.type === 'destroy' && 
          latestDeployment?.status === 'success'
        ) {
          return true
        }
        // If there is an active deployment and it is a create and it
        // was either a success of partial success then there is at 
        // least some infrastucture deployed -- return true
        if (activeDeployment?.type === 'create') {
          if (activeDeployment.status === 'success') return true
          if (activeDeployment.status === 'partial_success') return true
          return false
        }
        return false
      })(),
      domain: service.domain,
      isDeleted: service.isDeleted,
      deleteEvent: service.deleteEvent,
      createdAt: service.createdAt,
      pack: service.pack
    }
  }
}

export class DeploymentView {
  static fromDeployment(deployment: t.Deployment): t.DeploymentView {
    return {
      _view: 'exo.deployment',
      id: deployment.id,
      type: deployment.type,
      platformId: deployment.platformId,
      serviceId: deployment.serviceId,
      startedAt: deployment.ledger.find(l => l.status === 'queued')?.timestamp ?? null,
      finishedAt: (() => {
        const finishingStatusLedgerEntries = deployment.ledger.filter(l => {
          const finishingStatusList: t.DeploymentStatus[] = [
            'canceled', 'failed', 'success', 'partial_success'
          ]
          return finishingStatusList.includes(l.status)
        }).map(l => l.timestamp)
        return (finishingStatusLedgerEntries.length ?? 0) > 0
          ? _.max(finishingStatusLedgerEntries)
          : null
      })(),
      status: deployment.ledger.reduce((a, b) => {
        return a.timestamp > b.timestamp ? a : b
      })?.status,
      ledger: deployment.ledger,
      logs: _.sort(deployment.logStream?.chunks ?? [], c => c.timestamp).reduce((acc, chunk) => {
        return `${acc}${chunk.content}`
      }, ''),
      attributes: deployment.attributes,
      config: deployment.config,
      trigger: deployment.trigger
    }
  }
}

export class DomainDeploymentView {
  static fromDomainDeployment(deployment: t.DomainDeployment): t.DomainDeploymentView {
    return {
      _view: 'exo.domain-deployment',
      id: deployment.id,
      platformId: deployment.platformId,
      domainId: deployment.domainId,
      startedAt: deployment.ledger.find(l => l.status === 'queued')?.timestamp ?? null,
      finishedAt: (() => {
        const finishingStatusLedgerEntries = deployment.ledger.filter(l => {
          const finishingStatusList: t.DeploymentStatus[] = [
            'canceled', 'failed', 'success', 'partial_success'
          ]
          return finishingStatusList.includes(l.status)
        }).map(l => l.timestamp)
        return (finishingStatusLedgerEntries.length ?? 0) > 0
          ? _.max(finishingStatusLedgerEntries)
          : null
      })(),
      status: deployment.ledger.reduce((a, b) => {
        return a.timestamp > b.timestamp ? a : b
      })?.status,
      ledger: deployment.ledger,
      logs: _.sort(deployment.logStream?.chunks ?? [], c => c.timestamp).reduce((acc, chunk) => {
        return `${acc}${chunk.content}`
      }, ''),
    }
  }
}

export class DeploymentContextView {
  static fromModels({
    platform,
    deployment
  }: {
    platform: t.Platform
    deployment: t.Deployment
  }): t.DeploymentContextView {
    const service = platform.services.find(s => s.id === deployment.serviceId)
    return {
      _view: 'exo.deployment.context',
      platform: _.shake({
        ...ElevatedPlatformView.fromPlatform(platform),
        services: undefined
      }),
      service: ServiceView.fromService(service),
      deployment: DeploymentView.fromDeployment(deployment)
    }
  }
}

export class DomainDeploymentContextView {
  static fromModels({
    platform,
    deployment
  }: {
    platform: t.Platform
    deployment: t.DomainDeployment
  }): t.DomainDeploymentContextView {
    const domain = platform.domains.find(d => d.id === deployment.domainId)
    return {
      _view: 'exo.domain-deployment.context',
      platform: _.shake({
        ...ElevatedPlatformView.fromPlatform(platform),
        services: undefined
      }),
      domain: DomainView.fromDomain(domain),
      deployment: DomainDeploymentView.fromDomainDeployment(deployment)
    }
  }
}

export default {
  UserView,
  PlatformPreviewView,
  PlatformView,
  ElevatedPlatformView,
  ServiceView,
  DeploymentView,
  DomainDeploymentView,
  DomainView,
  DeploymentContextView,
  DomainDeploymentContextView
}
