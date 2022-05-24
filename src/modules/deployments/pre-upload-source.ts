import _ from 'radash'
import * as t from '../../core/types'
import * as crypto from 'crypto'
import makeMongo, { MongoClient } from '../../core/db'
import config from '../../core/config'
import type { Props } from '@exobase/core'
import { useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import dur from 'durhuman'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  unitId: t.Id<'unit'>
}

interface Services {
  mongo: MongoClient
}

interface Response {
  url: string
  id: string
  exp: number
  timestamp: number
}

async function preUploadDeploymentSource({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo } = services
  const workspace = await mongo.findWorkspaceById(args.workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)
  const unit = platform.units.find(u => u.id === args.unitId)

  const deprefix = (str: t.Id) => str.replace(/exo\..+?\./, '')

  const timestamp = Date.now()
  const identifier = `${deprefix(workspace.id)}-${deprefix(platform.id)}-${deprefix(unit.id)}-${timestamp}`
  const id = crypto.createHash('md5').update(identifier).digest('hex')
  
  const client = new S3Client({
    region: 'us-east-1',
      credentials: {
        accessKeyId: config.s3UploadsAccessKeyId,
        secretAccessKey: config.s3UploadsAccessKey
      }
  })
  const command = new PutObjectCommand({
    Bucket: config.s3UploadsBucket,
    Key: `${id}.zip`
  })
  const exp = dur('8 seconds', 'seconds')
  const url = await getSignedUrl(client, command, { expiresIn: exp })

  return {
    url,
    id,
    exp,
    timestamp
  }
}

export default _.compose(
  useLambda(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useJsonArgs<Args>(yup => ({
    workspaceId: yup
      .string()
      .matches(/^exo\.workspace\.[a-z0-9]+$/)
      .required(),
    platformId: yup
      .string()
      .matches(/^exo\.platform\.[a-z0-9]+$/)
      .required(),
    unitId: yup
      .string()
      .matches(/^exo\.unit\.[a-z0-9]+$/)
      .required()
  })),
  useService<Services>({
    mongo: makeMongo()
  }),
  preUploadDeploymentSource
)
