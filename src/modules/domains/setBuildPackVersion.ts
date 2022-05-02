import _ from 'radash'
import * as t from '../../core/types'
import mappers from '../../core/view/mappers'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { errors } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { useMongoConnection } from '../../core/hooks/useMongoConnection'


interface Args {
  platformId: string
  domainId: string
  version: string
}

interface Services {
  mongo: MongoClient
}

interface Response {
  domain: t.DomainView
}

async function setBuildPackVersion({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const { platformId, domainId, version } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const domain = platform.domains.find(d => d.id === domainId)
  if (!domain) {
    throw errors.notFound({
      details: 'Could not find a domain with the given id in the current platform',
      key: 'exo.err.domains.set-build-pack-version.unfound'
    })
  }

  if (domain.pack.version) {
    throw errors.badRequest({
      details: 'The build pack version is immutable and has already been set',
      key: 'exo.err.domains.set-build-pack-version.immutable'
    })
  }

  const newDomain: t.Domain = {
    ...domain,
    pack: {
      ...domain.pack,
      // version
    }
  }

  await mongo.updateDomainInPlatform({
    id: platformId,
    domain: newDomain
  })

  return {
    domain: mappers.DomainView.fromDomain(newDomain)
  }
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'domain::update',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required(),
    domainId: yup.string().required(),
    version: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  useMongoConnection(),
  setBuildPackVersion
)