import * as t from '../types'
import _ from 'radash'


const listify = <T extends { id: string }>(obj: Record<string, T>): T[] => {
  return Object.values(obj ?? {})
}

export class UserDocument {
  static toModel(document: t.UserDocument): t.User {
    return document as t.User
  }
}

export class PlatformDocument {
  static toModel(document: t.PlatformDocument): t.Platform {
    return {
      ...document,
      services: listify(document.services),
      domains: listify(document.domains),
      _githubInstallations: listify(document._githubInstallations)
    }
  }
}

export class DeploymentDocument {
  static toModel(document: t.DeploymentDocument): t.Deployment {
    return document as t.Deployment
  }
}

export class DomainDeploymentDocument {
  static toModel(document: t.DomainDeploymentDocument): t.DomainDeployment {
    return document as t.DomainDeployment
  }
}

export class MembershipDocument {
  static toModel(document: t.MembershipDocument): t.Membership {
    return document as t.Membership
  }
}

export class RepositoryServiceLookupItemDocument {
  static toModel(document: t.RepositoryServiceLookupItemDocument): t.RepositoryServiceLookupItem {
    return document as t.RepositoryServiceLookupItem
  }
}

export class BuildPackageDocument {
  static toModel(document: t.BuildPackageDocument): t.BuildPackage {
    return document as t.BuildPackage
  }
}
