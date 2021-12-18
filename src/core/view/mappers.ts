import * as t from '../types'
import _ from 'radash'

export class UserView {
  static fromUser(user: t.User): t.UserView {
    return {
      _view: 'exo.user',
      id: user.id,
      did: user.did,
      email: user.email,
      acl: user.acl
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

export class PlatformView {
  static fromPlatform(platform: t.Platform): t.PlatformView {
    return {
      _view: 'exo.platform',
      id: platform.id,
      name: platform.name,
      environments: platform.environments.map(EnvironmentView.fromEnvironment),
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
      }
    }
  }
}

export class ElevatedPlatformView {
  static fromPlatform(platform: t.Platform): t.ElevatedPlatformView {
    return {
      _view: 'exo.platform.elevated',
      id: platform.id,
      environments: platform.environments.map(EnvironmentView.fromEnvironment),
      services: platform.services.map(ServiceView.fromService),
      name: platform.name,
      providers: platform.providers
    }
  }
}

export class EnvironmentView {
  static fromEnvironment(project: t.Environment): t.EnvironmentView {
    return {
      _view: 'exo.environment',
      id: project.id,
      name: project.name
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
      instances: service.instances.map(ServiceInstanceView.fromEnvironmentInstance)
    }
  }
}

export class ServiceInstanceView {
  static fromEnvironmentInstance(instance: t.ServiceInstance): t.ServiceInstanceView {
    return {
      _view: 'exo.service-instance',
      id: instance.id,
      environmentId: instance.environmentId,
      serviceId: instance.serviceId,
      mute: instance.mute,
      config: instance.config,
      deployments: (instance.deployments ?? []).map(DeploymentView.fromDeployment),
      attributes: instance.attributes,
      latestDeploymentId: instance.latestDeploymentId ?? null
    }
  }
}

export class DeploymentView {
  static fromDeployment(deployment: t.Deployment): t.DeploymentView {
    return {
      _view: 'exo.deployment',
      id: deployment.id,
      platformId: deployment.platformId,
      environmentId: deployment.environmentId,
      serviceId: deployment.serviceId,
      instanceId: deployment.instanceId,
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
      functionMap: deployment.functionMap
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
    const environment = platform.environments.find(e => e.id === deployment.environmentId)
    const instance = service.instances.find(i => i.environmentId === deployment.environmentId)
    return {
      _view: 'exo.deployment.context',
      platform: _.shake({
        ...ElevatedPlatformView.fromPlatform(platform),
        services: undefined
      }),
      service: _.shake({
        ...ServiceView.fromService(service),
        instances: undefined
      }),
      instance: ServiceInstanceView.fromEnvironmentInstance(instance),
      environment: EnvironmentView.fromEnvironment(environment),
      deployment: DeploymentView.fromDeployment(deployment),
    }
  }
}

export default {
  UserView,
  PlatformPreviewView,
  PlatformView,
  ElevatedPlatformView,
  EnvironmentView,
  ServiceView,
  DeploymentView,
  DeploymentContextView
}
