import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'

import type { Props } from '@exobase/core'
import { useService, useJsonArgs, useCors } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  logId: t.Id<'log'>
  after?: number
}

interface Services {
  mongo: MongoClient
}

interface Response {
  stream: {
    timestamp: number
    content: string
  }[]
}

async function pullLogStream({ args, services }: Props<Args, Services>): Promise<Response> {
  const { mongo } = services
  const log = await mongo.findLog({
    logId: args.logId
  })
  if (!log) return {
    stream: []
  }
  return {
    stream: args.after ? log.stream.filter(s => s.timestamp > args.after) : log.stream
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    after: yup.number(),
    logId: yup
      .string()
      .matches(/^exo\.log\.[a-z0-9]+$/)
      .required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  pullLogStream
)
