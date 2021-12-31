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
      latestDeploymentId: domain.latestDeploymentId
    }
  }
}

export class PlatformView {
  static fromPlatform(platform: t.Platform): t.PlatformView {
    return {
      _view: 'exo.platform',
      id: platform.id,
      name: platform.name,
      services: (platform.services ?? []).map(ServiceView.fromService),
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
    return {
      _view: 'exo.service',
      id: service.id,
      name: service.name,
      platformId: service.platformId,
      provider: service.provider,
      type: service.type,
      source: service.source,
      service: service.service,
      language: service.language,
      key: service.key,
      deployments: (service.deployments ?? []).map(DeploymentView.fromDeployment),
      latestDeploymentId: service.latestDeploymentId ?? null,
      tags: service.tags,
      latestDeployment: service.latestDeployment 
        ? DeploymentView.fromDeployment(service.latestDeployment) 
        : null,
      config: service.config,
      domain: service.domain
    }
  }
}

export class DeploymentView {
  static fromDeployment(deployment: t.Deployment): t.DeploymentView {
    return {
      _view: 'exo.deployment',
      id: deployment.id,
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
      logs: deployment.logs,
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
      logs: deployment.logs
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
