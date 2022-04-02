import * as t from '../model/types'
import type { ObjectId } from 'mongodb'
import type { ModelV1 } from '../model/archives/v1.types'

export interface MongoDocument {
  _id: ObjectId
  _version: number
}

//
// PLATFORMS
//

export type PlatformDocumentV1 = MongoDocument &
  Omit<t.Platform, 'services' | 'domains' | '_githubInstallations'> & {
    services: Record<string, ModelV1.Service>
    domains: Record<string, t.Domain>
    _githubInstallations: Record<string, { id: string }>
  }

export type PlatformDocumentV2 = MongoDocument &
  Omit<t.Platform, 'services' | 'domains' | '_githubInstallations'> & {
    services: Record<string, t.Service>
    domains: Record<string, t.Domain>
    _githubInstallations: Record<string, { id: string }>
  }

export type PlatformDocument = PlatformDocumentV2


//
// MEMBERSHIPS
//

export type MembershipDocument = MongoDocument &
  t.Membership & {
    _userId: ObjectId
    _platformId: ObjectId
  }


//
// DOCUMENTS
//

export type DeploymentDocument = MongoDocument &
  t.Deployment & {
    _platformId: ObjectId
    _serviceId: ObjectId
  }


//
// DOMAINS
//
export type DomainDeploymentDocument = MongoDocument &
  t.DomainDeployment & {
    _platformId: ObjectId
    _domainId: ObjectId
  }


//
// REPOSITORY LOOKUPS
//
export type RepositoryServiceLookupItemDocument = MongoDocument & t.RepositoryServiceLookupItem & {
  _platformId: ObjectId
  _serviceId: ObjectId
}


//
// USERS
//
export type UserDocument = MongoDocument & t.User
