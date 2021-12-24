import * as t from '../types'
import _ from 'radash'


const listify = <T extends { id: string }>(obj: Record<string, T>): T[] => {
  return Object.values(obj ?? {})
}

export class User {
  static fromUserRecord(document: t.UserDocument): t.User {
    return document as t.User
  }
}

export class Platform {
  static fromPlatformDocument(document: t.PlatformDocument): t.Platform {
    return {
      ...document,
      services: listify(document.services),
      domains: listify(document.domains),
      _githubInstallations: listify(document._githubInstallations)
    }
  }
}

export class Deployment {
  static fromDeploymentDocument(document: t.DeploymentDocument): t.Deployment {
    return document as t.Deployment
  }
}

export class DomainDeployment {
  static fromDomainDeploymentDocument(document: t.DomainDeploymentDocument): t.DomainDeployment {
    return document as t.DomainDeployment
  }
}

export class Membership {
  static fromMembershipDocument(document: t.MembershipDocument): t.Membership {
    return document as t.Membership
  }
}

export class RepositoryServiceLookupItem {
  static fromDocument(document: t.RepositoryServiceLookupItemDocument): t.RepositoryServiceLookupItem {
    return document as t.RepositoryServiceLookupItem
  }
}