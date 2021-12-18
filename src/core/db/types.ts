import * as t from '../model/types'
import { ObjectId } from 'mongodb'


export interface MongoDocument {
  _id: ObjectId
}

type ServiceDocumentObject = Omit<t.Service, 'instances'> & {
  instances: Record<string, t.ServiceInstance>
}

export type PlatformDocument = MongoDocument & Omit<t.Platform, 'services'> & {
  services: Record<string, ServiceDocumentObject>
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

export type UserDocument = MongoDocument & t.User
