import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'
import { errors, Props } from '@exobase/core'
import { useCors, useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  owner: string
  repo: string
  installationId: string | null
}

interface Services {
  mongo: MongoClient
  github: GithubApiMaker
}

interface Response {
  branches: {
    name: string
  }[]
}

async function listAvailableBranches({
  args,
  auth,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { workspaceId } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)

  if (args.installationId) {
    const installation = platform.sources.find(s => s._installationId === args.installationId)
    if (!installation) {
      throw errors.badRequest({
        details: 'The Exobase Bot github app has not been installed and connected to the current platform',
        key: 'exo.err.platforms.list-available-branches.mahoney'
      })
    }
  }

  const { branches } = await github(args.installationId).listAvailableBranches({
    owner: args.owner,
    repo: args.repo
  })

  return {
    branches
  }
}

export default _.compose(
  useLambda(),
  useCors(),
  useJsonArgs(yup => ({
    workspaceId: yup.string().required(),
    platformId: yup.string().required(),
    installationId: yup.string().nullable(),
    owner: yup.string().required(),
    repo: yup.string().required()
  })),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo(),
    github: makeGithub
  }),

  listAvailableBranches
)
