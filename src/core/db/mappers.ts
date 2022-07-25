import * as t from '../types'
import * as _ from 'radash'

export class UserDocument {
  static toModel(document: t.UserDocument): t.User {
    return document as t.User
  }
}

export class WorkspaceDocument {
  static toModel(document: t.WorkspaceDocument): t.Workspace {
    return _.shake({
      ...document,
      _repos: undefined,
      _members: undefined,
      _platforms: undefined
    }) as t.Workspace
  }
}

export class BuildPackageDocument {
  static toModel(document: t.BuildPackageDocument): t.BuildPackage {
    return document as t.BuildPackage
  }
}

export class LogDocument {
  static toModel(document: t.LogDocument): t.Log {
    return document as t.Log
  }
}
