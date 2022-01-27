/**
 * Module that can be used to generate the correct
 * build pack name. A bit of business logic.
 */
import * as t from "./types";

export default class BuildPack {
  static forService(service: Pick<t.Service, 'type' | 'provider' | 'service' | 'language'>) {
    return `${service.type}-${service.provider}-${service.service}${
      service.language ? `-${service.language}` : ""
    }`;
  }
  static forDomain(domain: Pick<t.Domain, 'provider'>) {
    return `domain-${domain.provider}`;
  }
}
