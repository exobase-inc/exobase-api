import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useVercel } from '@exobase/vercel'
import { useTokenAuthentication } from '@exobase/auth'


interface Args {
  platformId: string
  serviceId: string
  deploymentId: string
}

interface Services {
  mongo: MongoClient
  github: GithubApiMaker
}

interface Response {
  url: string
}

async function getSourceDownloadLink({ args, services }: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services
  const { platformId, serviceId } = args

  const [err, platform] = await mongo.findPlatformById({ id: platformId })
  if (err) throw err

  const service = platform.services.find(s => s.id === serviceId)
  if (!service) {
    throw errors.badRequest({
      details: 'Service with given id not found',
      key: 'exo.err.services.get-source-download-link.mania'
    })
  }

  const source = service.source
  
  if (!source.private) {
    return {
      url: `https://github.com/${source.owner}/${source.repo}/archive/refs/heads/${source.branch}.zip`
    }
  }

  const installation = platform._githubInstallations.find(gi => gi.id === source.installationId)

  if (!installation) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.services.get-source-download-link.mahoney'
    })
  }

  const [gerr, result] = await _.try(github(installation.id).getRepositoryDownloadLink)({
    owner: service.source.owner,
    repo: service.source.repo,
    branch: service.source.branch
  })
  if (gerr) throw gerr

  return {
    url: result.link
  }
}

export default _.compose(
  useVercel(),
  useJsonArgs<Args>(yup => ({
    platformId: yup.string().required(),
    serviceId: yup.string().required(),
    deploymentId: yup.string().required()
  })),
  useTokenAuthentication({
    type: 'access',
    iss: 'exo.api',
    scope: 'services::read',
    tokenSignatureSecret: config.tokenSignatureSecret
  }),
  useService<Services>({
    mongo: makeMongo(),
    github: makeGithub
  }),
  getSourceDownloadLink
)