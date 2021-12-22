import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useCors, useJsonArgs, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  owner: string
  repo: string
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

async function listAvailableBranches({ args, auth, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { platformId } = auth.token.extra
  const { owner, repo } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const installationId = platform._githubInstallationId
  if (!installationId) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.platforms.list-available-branches.mahoney'
    })
  }

  const [gerr, { branches }] = await _.try(github(installationId).listAvailableBranches)({
    owner,
    repo
  })
  if (gerr) throw gerr

  return {
    branches
  }
}

export default _.compose(
  useVercel(),
  useCors(),
  useJsonArgs(yup => ({
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