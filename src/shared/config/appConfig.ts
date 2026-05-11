import { constants } from 'helpers'


export const appConfig = {
  companyName: constants.companyName,
  baseUrl: constants.baseUrl,
  links: constants.links,
  prediktsTaxonomy: constants.prediktsTaxonomy,
  hasRequiredAppEnv: constants.hasRequiredAppEnv,
  missingAppEnv: constants.missingAppEnv,
} as const
