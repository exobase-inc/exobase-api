import _ from 'radash'
import makeApi from '@exobase/client-builder'
import config from './config'

const endpoint = makeApi(config.builderApiUrl)

const api = {
  trigger: {
    build: endpoint<{
      args: {
        deploymentId: string
        workspaceId: string
        platformId: string
        unitId: string
        logId: string
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