import * as t from '../model/types'
import type { ObjectId } from 'mongodb'


export interface MongoDocument {
  _id: ObjectId
}

export type PlatformDocument = MongoDocument & Omit<t.Platform, 'services' | 'domains' | '_githubInstallations'> & {
  services: Record<string, t.Service>
  domains: Record<string, t.Domain>
  _githubInstallations: Record<string, { id: string }>
}

export type MembershipDocument = MongoDocument & t.Membership & {
  _userId: ObjectId
  _platformId: ObjectId
}

export type DeploymentDocument = MongoDocument & t.Deployment & {
  _platformId: ObjectId
  _serviceId: ObjectId
}

export type DomainDeploymentDocument = MongoDocument & t.DomainDeployment & {
  _platformId: ObjectId
  _domainId: ObjectId
}

export type RepositoryLookupDocument = MongoDocument & t.RepositoryServiceLookupItem

export type UserDocument = MongoDocument & t.User

export type RepositoryServiceLookupItemDocument = t.RepositoryServiceLookupItem & {
  _platformId: ObjectId
  _serviceId: ObjectId
}