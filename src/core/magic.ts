import _ from 'radash'
import type { Props, ApiFunction } from '@exobase/core'
import { errors } from '@exobase/core'
import * as magicsdk from '@magic-sdk/admin'


export type MagicAuth = {
  magic: {
    email: string
    userId: string
    didToken: string
  }
}

export async function withMagicAuthentication(func: ApiFunction, magic: magicsdk.Magic, props: Props) {
  const header = props.req.headers['authorization'] as string
  
  if (!header) {
    throw errors.unauthorized({
      details: 'This function requires an authorization header',
      key: 'exo.err.core.magic.moringlaw'
    })
  }

  const didToken = header.replace('Bearer ', '')

  const [err] = await _.try(magic.token.validate)(didToken)

  if (err) {
    console.error(err)
    throw errors.forbidden({
      details: 'The provided token could not be validated', 
      key: 'exo.err.core.magic.aquarius'
    })
  }

  const { email, publicAddress } = await magic.users.getMetadataByToken(didToken)

  const auth: MagicAuth = {
    magic: {
      email,
      userId: publicAddress,
      didToken
    }
  }

  return await func({ ...props, auth })
}

export const useMagicAuthentication = (magicSecret: string) => {
  return (func: ApiFunction) => _.partial(withMagicAuthentication, func, new magicsdk.Magic(magicSecret))
}