import * as _ from 'radash'
import config from './config'
import { createAppAuth } from "@octokit/auth-app"
import { request } from "@octokit/request"


const makeGithub = (installationId?: string | null) => {

  const auth = createAppAuth({
    appId: config.githubAppId,
    clientId: config.githubClientId,
    privateKey: config.githubPrivateKey,
    installationId
  })

  const requestWithAuth = request.defaults({
    request: {
      hook: auth.hook
    }
  })

  return {
    listAvailableRepositories: async (): Promise<{
      repositories: {
        id: number
        name: string
        fullName: string
        owner: string
      }[]
    }> => {
      // See: https://docs.github.com/en/rest/reference/apps#list-repositories-accessible-to-the-app-installation
      const [err, result] = await _.try(() => requestWithAuth("GET /installation/repositories"))()
      if (err) throw err
      return {
        repositories: result.data.repositories.map(r => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          owner: r.owner.login
        }))
      }
    },
    listAvailableBranches: async ({ owner, repo }: { owner: string, repo: string }): Promise<{
      branches: {
        name: string
      }[]
    }> => {
      // See: https://docs.github.com/en/rest/reference/branches#list-branches
      const [err, result] = await _.try(() => requestWithAuth("GET /repos/{owner}/{repo}/branches", {
        owner,
        repo
      }))()
      if (err) throw err
      return {
        branches: result.data.map(branch => ({
          name: branch.name
        }))
      }
    },
    getRepositoryDownloadLink: async ({ owner, repo, branch }: {
      owner: string
      repo: string
      branch: string
    }): Promise<{
      link: string
    }> => {
      console.log({
        installationId,
        owner,
        repo,
        ref: `refs/heads/${branch}`
      })
      // See: https://docs.github.com/en/rest/reference/repos#download-a-repository-archive-zip
      // and: https://github.com/octokit/request.js/issues/240#issuecomment-676604480
      const [err, result] = await _.try(() => requestWithAuth('HEAD /repos/{owner}/{repo}/zipball/{ref}', {
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        request: {
          
        }
      }))()
      if (err) throw err
      return {
        link: result.url
      }
    }
  }

}

export type GithubApi = ReturnType<typeof makeGithub>
export type GithubApiMaker = (iid: string) => GithubApi

export default makeGithub