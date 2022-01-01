import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useCors, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'


interface Args { }

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

async function listAvailableRepositories({ auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { platformId } = auth.token.extra

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const installations = platform._githubInstallations
  if (!installations || installations.length === 0) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.platforms.list-available-repositories.mankey'
    })
  }

  const responses = await Promise.all(installations.map(({ id }) => {
    return _.try(github(id).listAvailableRepositories)().then(([ error, result ]) => ({ 
      error, 
      repositories: result.repositories, 
      id
    }))
  }))

  const failures = responses.map(r => r.error).filter(err => !!err)

  if (failures.length > 0) {
    console.error(failures)
    throw errors.unknown({
      details: `Unknown failure while asking GitHub for your connected repositories`,
      key: 'exo.err.platforms.list-available-repositories.rourk'
    })
  }

  const repositories = _.flat(responses.map(r => r.repositories.map(x => ({  
    id: `${x.id}`,
    repo: x.name,
    owner: x.owner,
    installationId: r.id 
  }))))

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
  useService<Services>({
    mongo: makeMongo(),
    github: makeGithub
  }),
  listAvailableRepositories
)