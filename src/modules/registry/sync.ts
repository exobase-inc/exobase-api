import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import model from '../../core/model'
import { errors, Props } from '@exobase/core'
import { useCors, useService, useJsonArgs } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import makeTerraform, { TerraformClient } from '../../core/terraform'
import { useTokenAuth } from '../../core/hooks/useTokenAuth'

interface Args {
  packId: t.Id<'pack'>
}

interface Services {
  mongo: MongoClient
  tf: TerraformClient
}

interface Response {
  pack: t.BuildPackage
}

async function syncPack({ auth, args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, tf } = services
  const userId = auth.token.sub as t.Id<'user'>

  const user = await mongo.findUserId({ userId })
  if (!user) {
    throw errors.badRequest({
      details: 'User not found',
      key: 'exo.err.registry.sync.no-user'
    })
  }

  const pack = await mongo.findBuildPackageById({
    id: args.packId
  })
  if (!pack) {
    throw errors.badRequest({
      details: 'Pack not found',
      key: 'exo.err.registry.sync.no-pack'
    })
  }

  // TODO: Validate that the url points to a properly
  // named terraform package / exobase build pack
  // 1. matching the pattern terraform-{provider}-exo-{name}

  const mod = await tf.findModuleAtLatest({
    namespace: pack.namespace,
    name: pack.name,
    provider: pack.provider
  })

  const versions = pack.versions.map(v => v.version)
  if (versions.includes(mod.version)) {
    return // TODO: Error worthy?
  }

  const manifest = await tf.getModuleManifest({
    namespace: mod.namespace,
    name: mod.name,
    provider: mod.provider,
    version: mod.version
  })

  // TODO: Validate that the manifest exists
  // and that it has all required fields
  // and that the fields all have valid values

  const newPack: t.BuildPackage = {
    ...pack,
    latest: mod.version,
    versions: [
        ...pack.versions,
      {
        version: mod.version,
        source: mod.source,
        publishedAt: new Date(mod.published_at).getTime(),
        readme: mod.root.readme,
        manifest,
        inputs: mod.root.inputs.map(input => {
          const manifestProps = manifest.inputs[input.name]
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
      }
    ]
  }

  await mongo.updateBuildPackage({
    id: pack.id,
    pack: newPack
  })

  return {
    pack: newPack
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useTokenAuth(),
  useJsonArgs<Args>(yup => ({
    packId: yup
      .string()
      .matches(/^exo\.pack\.[a-z0-9]+$/)
      .required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    tf: makeTerraform()
  }),
  syncPack
)
