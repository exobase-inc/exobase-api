import * as t from '../model/types'
import { ObjectId } from 'mongodb'


export interface MongoDocument {
  _id: ObjectId
}

type ServiceDocumentObject = Omit<t.Service, 'instances'> & {
  instances: Record<string, t.ServiceInstance>
}

export type PlatformDocument = MongoDocument & Omit<t.Platform, 'services' | 'domains'> & {
  services: Record<string, ServiceDocumentObject>
  domains: Record<string, t.Domain>
}

export type MembershipDocument = MongoDocument & t.Membership & {
  _userId: ObjectId
  _platformId: ObjectId
  _environmentId: ObjectId
}

export type DeploymentDocument = MongoDocument & t.Deployment & {
  _platformId: ObjectId
  _serviceId: ObjectId
  _environmentId: ObjectId
  _instanceId: ObjectId
}

export type DomainDeploymentDocument = MongoDocument & t.DomainDeployment & {
  _platformId: ObjectId
  _domainId: ObjectId
}

export type UserDocument = MongoDocument & t.User
