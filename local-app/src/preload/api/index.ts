import { coreAPI } from './core'
import { dataAPI } from './data'
import { featuresAPI } from './features'
import { systemAPI } from './system'

export const gnoviumAPI = {
  ...coreAPI,
  ...dataAPI,
  ...featuresAPI,
  ...systemAPI,
}
