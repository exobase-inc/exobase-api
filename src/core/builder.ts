import _ from 'radash'
import makeApi from '@exobase/client-builder'
import config from './config'

const endpoint = makeApi(config.builderApiUrl)

const api = {
  trigger: {
    build: endpoint<{
      args: {
        action: 'deploy-domain' | 'deploy-stack' | 'destroy-stack'
        deploymentId: string
      }
    }, void>({
      module: 'trigger',
      function: 'build'
    })
  }
}

export type BuilderApi = typeof api

const makeBuilderApi = () => api

export default makeBuilderApi