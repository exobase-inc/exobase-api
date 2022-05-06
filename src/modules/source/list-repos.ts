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
}

interface Services {
  mongo: MongoClient
  github: GithubApiMaker
}

interface Response {
  repositories: {
    installationId: string
    id: string
    repo: string
    owner: string
  }[]
}

async function listAvailableRepositories({
  args,
  auth,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { workspaceId } = auth.token.extra

  const workspace = await mongo.findWorkspaceById(workspaceId)
  const platform = workspace.platforms.find(p => p.id === args.platformId)

  if (platform.sources.length === 0) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.platforms.list-available-repositories.mankey'
    })
  }

  const responses = await Promise.all(
    platform.sources.map(({ _installationId }) => {
      return _.try(github(_installationId).listAvailableRepositories)().then(([error, result]) => ({
        error,
        repositories: result.repositories,
        id: _installationId
      }))
    })
  )

  const failures = responses.map(r => r.error).filter(err => !!err)

  if (failures.length > 0) {
    console.error(failures)
    throw errors.unknown({
      details: `Unknown failure while asking GitHub for your connected repositories`,
      key: 'exo.err.platforms.list-available-repositories.rourk'
    })
  }

  const repositories = _.flat(
    responses.map(r =>
      r.repositories.map(x => ({
        id: `${x.id}`,
        repo: x.name,
        owner: x.owner,
        installationId: r.id
      }))
    )
  )

  return {
    repositories
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
  useJsonArgs(yup => ({
    workspaceId: yup.string().required(),
    platformId: yup.string().required()
  })),
  useService<Services>({
    mongo: makeMongo(),
    github: makeGithub
  }),
  listAvailableRepositories
)
