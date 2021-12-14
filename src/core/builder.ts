import _ from 'radash'
import makeApi from '@exobase/api'
import config from './config'


console.log(config)

const endpoint = makeApi(config.builderApiUrl)

const api = {
  deployments: {
    initNewDeployment: endpoint<{
      deploymentId: string
    }, void>({
      module: 'deployments',
      function: 'initNewDeployment'
    })
  }
}

export type BuilderApi = typeof api

const makeBuilderApi = () => api

export default makeBuilderApi