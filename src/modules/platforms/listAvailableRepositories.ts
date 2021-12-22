import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useCors, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {}

interface Services {
  mongo: MongoClient
  github: GithubApiMaker
}

interface Response {
  repositories: {
    id: number
    name: string
    fullName: string
    owner: string
  }[]
}

async function listAvailableRepositories({ auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const installationId = platform._githubInstallationId
  if (!installationId) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.platforms.list-available-repositories.mankey'
    })
  }

  const [gerr, { repositories }] = await _.try(github(installationId).listAvailableRepositories)()
  if (gerr) throw gerr

  return {
    repositories
  }
}

export default _.compose(
  useVercel(),
  useCors(),
  useTokenAuthentication({
    type: 'id',
    iss: 'exo.api',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo(),
    github: makeGithub
  }),
  listAvailableRepositories
)