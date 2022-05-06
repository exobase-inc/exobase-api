import * as t from './types'
import { createToken as createTokenWithExobase } from '@exobase/auth'
import dur from 'durhuman'
import config from './config'
import bcrypt from 'bcryptjs'


const SALT_ROUNDS = 10
export const generatePasswordHash = async (password: string): Promise<[Error, string]> => {
  return new Promise(resolve => {
    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
      if (err) resolve([err, null])
      else resolve([null, hash])
    })
  })
}

export async function comparePasswordToHash(providedPassword: string, savedHash: string): Promise<[Error, boolean]> {
  return new Promise(resolve => {
    bcrypt.compare(providedPassword, savedHash, (err, isMatch) => {
      if (err) resolve([err, false])
      else resolve([null, isMatch])
    })
  })
}


export const createToken = ({
    userId,
    username,
    thumbnailUrl,
    aud,
    workspaceId,
    ttl
}: {
    userId: t.Id<'user'>
    username: string
    thumbnailUrl: string
    workspaceId: t.Id<'workspace'>
    aud: 'exo.app' | 'exo.cli',
    ttl: number
}) => createTokenWithExobase({
    sub: userId,
    iss: 'exo.api',
    ttl,
    type: 'id',
    aud,
    entity: 'user',
    provider: 'magic',
    secret: config.tokenSignatureSecret,
    extra: {
      workspaceId,
      username,
      thumbnailUrl
    }
  })