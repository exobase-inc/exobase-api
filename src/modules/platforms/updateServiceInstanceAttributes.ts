import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import { Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  serviceId: string
  platformId: string
  instanceId: string
  attributes: Record<string, string | number>
}

interface Services {
  mongo: MongoClient
}

async function updateServiceInstanceAttributes({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<void> {
  const { mongo } = services
  const { platformId, serviceId, instanceId, attributes } = args

  const [err] = await mongo.updateServiceInstanceAttributes({
    platformId,
    serviceId,
    instanceId,
    attributes
  })
  if (err) throw err

}

export default _.compose(
  useVercel(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'instance::update::attributes',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required(),
    serviceId: yup.string().required(),
    instanceId: yup.string().required(),
    attributes: yup.mixed().default({})
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  updateServiceInstanceAttributes
)