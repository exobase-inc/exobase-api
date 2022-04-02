import * as t from '../../../types'
import model from '../../../model'

export default (document: t.PlatformDocumentV1): t.PlatformDocumentV2 => {
  return { 
    ...document,
    _version: 2,
    services: Object.values(document.services).reduce((acc, service) => {
      const migratedService: t.Service = {
        id: service.id,
        name: service.name,
        tags: service.tags,
        platformId: service.platformId,
        stackName: model.stackName(service.buildPack.name, service.id),
        source: service.source,
        latestDeployment: service.latestDeployment,
        activeDeployment: service.activeDeployment,
        domain: service.domain,
        isDeleted: service.isDeleted,
        deleteEvent: service.deleteEvent,
        createdAt: service.createdAt,
        buildPack: {
          version: service.buildPack.version,
          name: service.buildPack.name,
          source: 'exo.registry.exobase',
          type: service.type,
          provider: service.provider,
          service: service.service,
          language: service.language,
          config: {
            ...service.config.stack,
            environmentVariables: service.config.environmentVariables
          }
        }
      }
      return {
        ...acc,
        [service.id]: migratedService
      }
    }, {} as Record<string, t.Service>)
  }
}