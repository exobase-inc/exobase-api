import * as _ from 'radash'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import * as t from '../../core/types'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  logId: t.Id<'log'>
  timestamp: number
  content: string
}

interface Services {
  mongo: MongoClient
}

async function appendLogChunk({ args, services }: Props<Args, Services>) {
  const { mongo } = services
  await mongo.appendLogChunk({
    logId: args.logId,
    chunk: {
      timestamp: args.timestamp,
      content: args.content
    }
  })
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'deployment::update',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    logId: yup
      .string()
      .matches(/^exo\.log\.[a-z0-9]+$/)
      .required(),
    timestamp: yup.number().integer().positive().required(),
    content: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  appendLogChunk
)
