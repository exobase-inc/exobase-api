import * as t from '../model/types'
import type { ObjectId } from 'mongodb'

export interface MongoDocument {
  _id: ObjectId
  _version: number
}

//
// PLATFORMS
//
export type WorkspaceDocument = MongoDocument & t.Workspace & {
  _repos: Record<string /* repoId */, true>
  _members: Record<string /* userId */, true>
  _platforms: Record<string /* platformId */, true>
}

//
// LOGS
//
export type LogDocument = MongoDocument & t.Log & {
  _deploymentId: ObjectId
  _workspaceId: ObjectId
  _platformId: ObjectId
  _unitId: ObjectId
}

//
// USERS
//
export type UserDocument = MongoDocument & t.User

//
// REGISTRY
//
export type BuildPackageDocument = MongoDocument & t.BuildPackage
