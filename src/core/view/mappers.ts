import * as t from '../types'
import * as _ from 'radash'

export class UserView {
  static toView(user: t.User, workspaces: t.Workspace[]): t.UserView {
    return {
      _view: 'exo.user',
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      thumbnailUrl: user.thumbnailUrl,
      workspaces: workspaces.map(w => ({
        name: w.name,
        id: w.id
      }))
    }
  }
}

export class WorkspaceView {
  static toView(workspace: t.Workspace): t.WorkspaceView {
    return {
      _view: 'exo.workspace',
      id: workspace.id,
      subscription: workspace.subscription,
      name: workspace.name,
      platforms: workspace.platforms.map(PlatformView.toView),
      members: workspace.members.map(m => ({
        user: m.user,
        role: m.role
      }))
    }
  }
}

export class DomainView {
  static toView(domain: t.Domain): t.DomainView {
    return {
      _view: 'exo.domain',
      id: domain.id,
      workspaceId: domain.workspaceId,
      platformId: domain.platformId,
      unitId: domain.unitId,
      domain: domain.domain,
      provider: domain.provider,
      status: domain.status
    }
  }
}

export class PlatformView {
  static toView(platform: t.Platform): t.PlatformView {
    return {
      _view: 'exo.platform',
      id: platform.id,
      workspaceId: platform.workspaceId,
      name: platform.name,
      units: platform.units.filter(u => !u.deleted).map(UnitView.toView),
      providers: {
        aws: {
          region: platform.providers.aws.auth?.region,
          configured: (
            !!platform.providers.aws.auth?.accessKeyId &&
            !!platform.providers.aws.auth?.accessKeySecret &&
            !!platform.providers.aws.auth?.region
          ),
          domains: platform.providers.aws.domains.map(DomainView.toView)
        },
        gcp: {
          configured: !!platform.providers.gcp.auth?.jsonCredentials,
          domains: platform.providers.gcp.domains.map(DomainView.toView)
        }
      },
      sources: platform.sources.map(s => ({
        private: s.private,
        repoId: s.repoId,
        repo: s.repo,
        owner: s.owner,
        provider: 'github'
      })),
      hasConnectedGithubApp: platform.sources.length > 0,
      createdAt: platform.createdAt,
      createdBy: platform.createdBy
    }
  }
}

export class UnitView {
  static toView(unit: t.Unit): t.UnitView {
    const latestDeployment = unit.latestDeployment
      ? DeploymentView.toView(unit.latestDeployment)
      : null
    const activeDeployment = unit.activeDeployment
      ? DeploymentView.toView(unit.activeDeployment)
      : null
    const inProgressStatuses: t.DeploymentStatus[] = ['in_progress', 'queued']
    const hasDeploymentInProgress = inProgressStatuses.includes(latestDeployment?.status)
    return {
      _view: 'exo.unit',
      id: unit.id,
      name: unit.name,
      type: unit.type,
      platformId: unit.platformId,
      workspaceId: unit.workspaceId,
      source: unit.source ? {
        private: unit.source.private,
        repoId: unit.source.repoId,
        owner: unit.source.owner,
        repo: unit.source.repo,
        branch: unit.source.branch,
        provider: unit.source.provider
      } : null,
      tags: unit.tags,
      deployments: (unit.deployments ?? []).map(DeploymentView.toView),
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
      domain: unit.domain ? {
        id: unit.domain.id,
        domain: unit.domain.domain,
        subdomain: unit.domain.subdomain,
        fqd: unit.domain.fqd
      } : null,
      attributes: unit.attributes,
      config: unit.config,
      ledger: (() => {
        if (unit.ledger.length > 20) return unit.ledger.slice(0, 20)
        return unit.ledger
      })(),
      deleted: unit.deleted,
      createdAt: unit.createdAt,
      createdBy: unit.createdBy,
      pack: BuildPackageRefView.toView(unit.pack)
    }
  }
}

export class BuildPackageView {
  static toView(pack: t.BuildPackage): t.BuildPackageView {
    return {
      _view: 'exo.pack',
      id: pack.id,
      name: pack.name,
      repo: pack.repo,
      type: pack.type,
      provider: pack.provider,
      service: pack.service,
      language: pack.language,
      owner: pack.owner,
      latest: pack.latest,
      versions: pack.versions,
      addedBy: pack.addedBy,
      addedAt: pack.addedAt
    }
  }
}
export class BuildPackageRefView {
  static toView(pack: t.BuildPackageRef): t.BuildPackageRefView {
    return {
      _view: 'exo.pack-ref',
      id: pack.id,
      name: pack.name,
      repo: pack.repo,
      type: pack.type,
      provider: pack.provider,
      service: pack.service,
      language: pack.language,
      owner: pack.owner,
      latest: pack.latest,
      addedBy: pack.addedBy,
      addedAt: pack.addedAt,
      version: pack.version
    }
  }
}

export class DeploymentView {
  static toView(deployment: t.Deployment): t.DeploymentView {
    return {
      _view: 'exo.deployment',
      id: deployment.id,
      workspaceId: deployment.workspaceId,
      platformId: deployment.platformId,
      unitId: deployment.unitId,
      logId: deployment.logId,
      type: deployment.type,
      startedAt: deployment.startedAt,
      finishedAt: deployment.finishedAt,
      status: deployment.status,
      output: deployment.output,
      vars: deployment.vars,
      trigger: deployment.trigger
    }
  }
}

export class DeploymentContextView {
  static toView({
    platform,
    workspace,
    unit,
    provider,
    deployment
  }: {
    workspace: t.Workspace
    platform: t.Platform
    unit: t.Unit
    provider: t.AWSProvider | t.GCPProvider
    deployment: t.Deployment
  }): t.DeploymentContextView {
    return {
      _view: 'exo.deployment.context',
      workspace: _.shake({
        ...WorkspaceView.toView(workspace),
        platforms: undefined
      }),
      provider,
      platform: _.shake({
        ...PlatformView.toView(platform),
        units: undefined
      }),
      unit: UnitView.toView(unit),
      config: unit.config,
      pack: BuildPackageRefView.toView(unit.pack),
      deployment: DeploymentView.toView(deployment)
    }
  }
}

export default {
  UserView,
  WorkspaceView,
  PlatformView,
  UnitView,
  DeploymentView,
  DomainView,
  BuildPackageView,
  DeploymentContextView
}
