import _ from 'radash'
import * as t from '../../core/types'
import makeMongo, { MongoClient } from '../../core/db'
import makeGithub, { GithubApiMaker } from '../../core/github'
import config from '../../core/config'

import { errors, Props } from '@exobase/core'
import { useJsonArgs, useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'
import { useTokenAuthentication } from '@exobase/auth'

interface Args {
  workspaceId: t.Id<'workspace'>
  platformId: t.Id<'platform'>
  unitId: t.Id<'unit'>
  deploymentId: t.Id<'deploy'>
}

interface Services {
  mongo: MongoClient
  github: GithubApiMaker
}

interface Response {
  url: string
}

async function getSourceDownloadLink({
  args,
  services
}: Props<Args, Services, t.PlatformTokenAuth>): Promise<Response> {
  const { mongo, github } = services

  const workspace = await mongo.findWorkspaceById(args.workspaceId)
  if (!workspace) {
    throw errors.notFound({
      details: 'Could not find a workspace matching the current session',
      key: 'exo.err.units.get-source-download-link.no-workspace'
    })
  }

  const platform = workspace.platforms.find(p => p.id === args.platformId)
  if (!platform) {
    throw errors.notFound({
      details: 'Could not find a platform matching the given id',
      key: 'exo.err.units.get-source-download-link.no-platform'
    })
  }

  const unit = platform.units.find(u => u.id === args.unitId)
  if (!unit) {
    throw errors.notFound({
      details: 'Could not find a unit matching the given id',
      key: 'exo.err.units.get-source-download-link.no-unit'
    })
  }

  const source = unit.source
  if (!source) {
    throw errors.notFound({
      details: 'The unit does not have a repository connected or configured',
      key: 'exo.err.units.get-source-download-link.no-source'
    })
  }

  if (!source.private) {
    return {
      url: `https://github.com/${source.owner}/${source.repo}/archive/refs/heads/${source.branch}.zip`
    }
  }

  const rootSource = platform.sources.find(s => s.repoId === source.repoId)

  if (!rootSource._installationId) {
    throw errors.badRequest({
      details: 'The Exobase Bot github app has not been installed and connected to the current platform',
      key: 'exo.err.services.get-source-download-link.mahoney'
    })
  }

  const [gerr, result] = await _.try(github(rootSource._installationId).getRepositoryDownloadLink)({
    owner: unit.source.owner,
    repo: unit.source.repo,
    branch: unit.source.branch
  })
  if (gerr) throw gerr

  return {
    url: result.link
  }
}

export default _.compose(
  useLambda(),
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
      .required(),
    deploymentId: yup
      .string()
      .matches(/^exo\.deploy\.[a-z0-9]+$/)
      .required()
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
