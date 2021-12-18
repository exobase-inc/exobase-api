import _ from 'radash'
import makeApi from '@exobase/api'
import config from './config'


console.log(config)

const endpoint = makeApi(config.builderApiUrl)

const api = {
  deployments: {
    deployStack: endpoint<{
      deploymentId: string
    }, void>({
      module: 'deployments',
      function: 'deployStack'
    }),
    deployDomain: endpoint<{
      deploymentId: string
    }, void>({
      module: 'deployments',
      function: 'deployDomain'
    })
  }
}

export type BuilderApi = typeof api

const makeBuilderApi = () => api

export default makeBuilderApi