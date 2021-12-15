import _ from 'radash'
import minimist from 'minimist'
import config from '../core/config'
import { createToken } from '@exobase/auth'


interface Args {
  scopes: string
  aud: string
  sub: string
}

const main = async (args: Args) => {
  const token = createToken({
    sub: args.sub,
    aud: args.aud,
    scopes: args.scopes.split(';'),
    type: 'access',
    iss: 'exo.api',
    ttl: 120000000,
    tokenSignatureSecret: config.tokenSignatureSecret
  })
  console.log(token)
}

main(minimist(process.argv) as any as Args).catch(err => {
  console.error(err)
  process.exit(1)
})
