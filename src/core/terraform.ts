import * as _ from 'radash'
import axios from 'axios'
import { URL } from 'url'
import * as t from './types'

const client = () => {

  const findModuleAtLatest = async (mod: { namespace: string; name: string; provider: string }) => {
    const response = await axios.get(
      `https://registry.terraform.io/v1/modules/${mod.namespace}/${mod.name}/${mod.provider}`,
      {
        method: 'GET'
      }
    )
    return response.data as GetModuleAtVerionResult
  }

  const findModuleAtVersion = async (mod: { namespace: string; name: string; provider: string; version: string }) => {
    const response = await axios.get(
      `https://registry.terraform.io/v1/modules/${mod.namespace}/${mod.name}/${mod.provider}/${mod.version}`,
      {
        method: 'GET'
      }
    )
    return response.data as GetModuleAtVerionResult
  }

  const listVersions = async (mod: { namespace: string; name: string; provider: string; }) => {
    const response = await axios.get(
      `https://registry.terraform.io/v1/modules/${mod.namespace}/${mod.name}/${mod.provider}/versions`,
      {
        method: 'GET'
      }
    )
    return {
      ...response.data?.modules[0],
      namespace: mod.namespace,
      name: mod.name,
      provider: mod.provider
    } as ListVersionsResult
  }

  const getModuleDownload = async (mod: { namespace: string; name: string; provider: string; version: string }) => {
    const response = await axios.get(
      `https://registry.terraform.io/v1/modules/${mod.namespace}/${mod.name}/${mod.provider}/${mod.version}/download`,
      {
        method: 'GET'
      }
    )
    return response.headers['x-terraform-get'] as string
  }

  const getModuleManifest = async (mod: { namespace: string; name: string; provider: string; version: string }) => {
    const response = await axios.get(
      `https://api.github.com/repos/${mod.namespace}/terraform-${mod.provider}-${mod.name}/contents/pack.json`,
      {
        method: 'GET'
      }
    )
    return JSON.parse(Buffer.from(response.data.content, 'base64').toString('ascii')) as t.BuildPackageManifest
  }

  const parseUrl = (url: string) => {
    const pathname = new URL(url).pathname + '/'
    const [namespace, name, provider, version] = /^\/modules\/(.+?)\/(.+?)\/(.+?)\/(.+?)\/$/.exec(pathname).slice(1)
    return {namespace, name, provider, version}
  }

  return {
    findModuleAtLatest,
    findModuleAtVersion,
    listVersions,
    getModuleDownload,
    getModuleManifest,
    parseUrl
  }
}

export type TerraformClient = ReturnType<typeof client>

export default client

type VersionItem = {
  version: string
  root: {
    providers: {
      name: string
      namespace: string
      source: string
      version: string
    }[]
    dependencies: {
      name: string
      source: string
      version: string
    }[]
  }
  submodules: any[]
}

type ListVersionsResult = {
  source: string
  versions: VersionItem[]
  namespace: string
  name: string
  provider: string
}

type GetModuleAtVerionResult = {
  id: string
  owner: string
  namespace: string
  name: string
  version: string
  provider: string
  provider_logo_url: string
  description: string
  source: string
  tag: string
  published_at: string
  downloads: number
  verified: boolean
  root: {
    path: string
    name: string
    readme: string
    empty: boolean
    inputs: {
      name: string
      type: string
      description: string
      default: string
      required: boolean
    }[]
    outputs: {
      name: string
      description: string
    }[]
    dependencies: {
      name: string
      source: string
      version: string
    }[]
    provider_dependencies: {
      name: string
      namespace: string
      source: string
      version: string
    }[]
    resources: {
      name: string
      type: string
    }[]
  }
  submodules: []
  examples: []
  providers: string[]
  versions: string[]
}
