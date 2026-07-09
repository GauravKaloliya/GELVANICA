import type { Endpoint } from './types';
import { systemEndpoints } from './modules/system';
import { authEndpoints } from './modules/auth';
import { workspaceEndpoints } from './modules/workspaces';
import { entityEndpoints } from './modules/entities';
import { tagEndpoints } from './modules/tags';
import { blockEndpoints } from './modules/blocks';
import { relationEndpoints } from './modules/relations';
import { commentEndpoints } from './modules/comments';
import { branchEndpoints } from './modules/branches';
import { versionEndpoints } from './modules/versions';
import { diffEndpoints } from './modules/diffs';
import { searchEndpoints } from './modules/search';
import { aiEndpoints } from './modules/ai';
import { fileEndpoints } from './modules/files';
import { graphEndpoints } from './modules/graph';
import { syncEndpoints } from './modules/sync';
import { activityEndpoints } from './modules/activity';
import { governanceEndpoints } from './modules/governance';
import { notificationEndpoints } from './modules/notifications';
import { jobEndpoints } from './modules/jobs';
import { dashboardEndpoints } from './modules/dashboard';
import { backupEndpoints } from './modules/backups';

export const ENDPOINTS: Endpoint[] = [
  ...systemEndpoints,
  ...authEndpoints,
  ...workspaceEndpoints,
  ...entityEndpoints,
  ...tagEndpoints,
  ...blockEndpoints,
  ...relationEndpoints,
  ...commentEndpoints,
  ...branchEndpoints,
  ...versionEndpoints,
  ...diffEndpoints,
  ...searchEndpoints,
  ...aiEndpoints,
  ...fileEndpoints,
  ...graphEndpoints,
  ...syncEndpoints,
  ...activityEndpoints,
  ...governanceEndpoints,
  ...notificationEndpoints,
  ...jobEndpoints,
  ...dashboardEndpoints,
  ...backupEndpoints,
];

export const getAllModules = () => {
  return [...new Set(ENDPOINTS.map(ep => ep.module))].sort();
};

export const getModuleEndpoints = (moduleName: string) => {
  return ENDPOINTS.filter(ep => ep.module.toLowerCase() === moduleName.toLowerCase());
};

export * from './types';
export * from './error-catalog';
export * from './changelog';
export * from './auth-guide';
