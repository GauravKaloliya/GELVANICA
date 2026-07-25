import { healthCheck, client } from './client'
import { authApi } from './auth'
import { workspacesApi } from './workspaces'
import { entitiesApi } from './entities'
import { blocksApi } from './blocks'
import { relationsApi } from './relations'
import { commentsApi } from './comments'
import { tagsApi } from './tags'
import { branchesApi, versionsApi, diffsApi } from './branches'
import { searchApi } from './search'
import { aiApi } from './ai'
import { settingsApi } from './settings'
import { filesApi } from './files'
import { graphApi } from './graph'
import { governanceApi } from './governance'
import { dashboardApi } from './dashboard'
import { notificationsApi } from './notifications'
import { syncApi } from './sync'
import { activityApi } from './activity'

export type { ActivityParams } from './activity'
import { backupsApi } from './backups'

export const api = {
  health: {
    check: () => healthCheck(),
  },
  auth: authApi,
  workspaces: workspacesApi,
  entities: entitiesApi,
  blocks: blocksApi,
  relations: relationsApi,
  comments: commentsApi,
  tags: tagsApi,
  branches: branchesApi,
  versions: versionsApi,
  diffs: diffsApi,
  search: searchApi,
  ai: aiApi,
  settings: settingsApi,
  files: filesApi,
  graph: graphApi,
  governance: governanceApi,
  dashboard: dashboardApi,
  notifications: notificationsApi,
  sync: syncApi,
  activity: activityApi,
  backups: backupsApi,
}

export { client as axiosClient }
