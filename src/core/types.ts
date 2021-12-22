import type { TokenAuth } from '@exobase/auth'

export * from './model/types'
export * from './view/types'
export * from './db/types'

export type PlatformTokenAuth = TokenAuth<{
  platformId: string
}>