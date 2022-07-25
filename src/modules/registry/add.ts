import * as _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import makeTerraform, { TerraformClient } from '../../core/terraform'
import { useTokenAuth } from '../../core/hooks/useTokenAuth'

interface Args {
  url: string
}

interface Services {
  mongo: MongoClient
  tf: TerraformClient
}

interface Response {
  pack: t.BuildPackage
}

async function addBuildPackageToRegistry({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, tf } = services
  const userId = auth.token.sub as t.Id<'user'>

  const user = await mongo.findUserId({ userId })
  if (!user) {
    throw errors.badRequest({
      details: 'User not found',
      key: 'exo.err.registry.add.no-user'
    })
  }

  // TODO: Validate that the url points to a properly
  // named terraform package / exobase build pack
  // 1. matching the pattern terraform-{provider}-exo-{name}

  const mod = await tf.findModuleAtLatest(tf.parseUrl(args.url))
  const manifest = await tf.getModuleManifest({
    namespace: mod.namespace,
    name: mod.name,
    provider: mod.provider,
    version: mod.version
  })
  
  // TODO: Validate that the manifest exists
  // and that it has all required fields
  // and that the fields all have valid values

  const pack: t.BuildPackage = {
    id: model.createId('pack'),
    name: mod.name,
    type: manifest.type,
    provider: mod.provider as t.CloudProvider,
    service: manifest.service ?? null,
    language: manifest.language ?? null,
    owner: mod.namespace,
    namespace: mod.namespace,
    repo: mod.source,
    latest: mod.version,
    url: args.url,
    versions: [{
      version: mod.version,
      source: mod.source,
      publishedAt: new Date(mod.published_at).getTime(),
      readme: mod.root.readme,
      manifest,
      inputs: mod.root.inputs.map(input => {
        const manifestProps = manifest.inputs?.[input.name]
        return {
          name: input.name,
          type: input.type,
          description: input.description,
          default: input.default,
          required: input.required,
          ui: manifestProps?.ui ?? (input.type as 'string' | 'number' | 'bool'),
          options: manifestProps?.options ?? null,
          label: manifestProps?.label ?? input.name,
          placeholder: manifestProps?.placeholder ?? null
        }
      }),
      outputs: mod.root.outputs.map(output => ({
        name: output.name,
        description: output.description
      }))
    }],
    addedBy: {
      id: userId,
      email: user.email,
      thumbnailUrl: user.thumbnailUrl,
      username: user.username
    },
    addedAt: Date.now()
  }

  await mongo.addBuildPackageToRegistry(pack)

  return {
    pack
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuth(),
  useJsonArgs<Args>(yup => ({
    url: yup.string().url().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    tf: makeTerraform()
  }),
  addBuildPackageToRegistry
)