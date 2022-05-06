import type { TokenAuth } from '@exobase/auth'

export * from './model/types'
export * from './view/types'
export * from './db/types'

import { Id } from './model/types'

export type PlatformTokenAuth = TokenAuth<{
  workspaceId: Id<'workspace'>
  username: string
  thumbnailUrl: string
}>