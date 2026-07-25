export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    list: (params?: Record<string, unknown>) => ['workspaces', 'list', params] as const,
    detail: (id: string) => ['workspaces', 'detail', id] as const,
    stats: (id: string) => ['workspaces', 'stats', id] as const,
  },
  entities: {
    all: ['entities'] as const,
    list: (workspaceId: string, params?: Record<string, unknown>) => ['entities', 'list', workspaceId, params] as const,
    detail: (id: string) => ['entities', 'detail', id] as const,
    children: (parentId: string) => ['entities', 'children', parentId] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    list: (entityId: string) => ['blocks', 'list', entityId] as const,
  },
  relations: {
    all: ['relations'] as const,
    list: (workspaceId: string) => ['relations', 'list', workspaceId] as const,
    outgoing: (entityId: string) => ['relations', 'outgoing', entityId] as const,
    backlinks: (entityId: string) => ['relations', 'backlinks', entityId] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: (workspaceId: string) => ['tags', 'list', workspaceId] as const,
  },
  comments: {
    all: ['comments'] as const,
    list: (entityId: string) => ['comments', 'list', entityId] as const,
  },
  files: {
    all: ['files'] as const,
    list: (workspaceId: string) => ['files', 'list', workspaceId] as const,
  },
  backups: {
    all: ['backups'] as const,
    list: ['backups', 'list'] as const,
  },
  graph: {
    all: ['graph'] as const,
    query: (workspaceId: string) => ['graph', 'query', workspaceId] as const,
  },
  search: {
    all: ['search'] as const,
    keyword: (workspaceId: string, query: string) => ['search', 'keyword', workspaceId, query] as const,
    semantic: (workspaceId: string, query: string) => ['search', 'semantic', workspaceId, query] as const,
    hybrid: (workspaceId: string, query: string) => ['search', 'hybrid', workspaceId, query] as const,
  },
  ai: {
    all: ['ai'] as const,
    query: (workspaceId: string, question: string) => ['ai', 'query', workspaceId, question] as const,
  },
  versioning: {
    all: ['versioning'] as const,
    history: (entityId: string) => ['versioning', 'history', entityId] as const,
    branches: (workspaceId: string) => ['versioning', 'branches', workspaceId] as const,
  },
  governance: {
    all: ['governance'] as const,
    health: (workspaceId: string) => ['governance', 'health', workspaceId] as const,
    duplicates: (workspaceId: string) => ['governance', 'duplicates', workspaceId] as const,
    orphans: (workspaceId: string) => ['governance', 'orphans', workspaceId] as const,
    stale: (workspaceId: string, days: number) => ['governance', 'stale', workspaceId, days] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (params?: Record<string, unknown>) => ['activity', 'list', params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    overview: (workspaceId: string) => ['dashboard', 'overview', workspaceId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: ['notifications', 'list'] as const,
  },
  settings: {
    all: ['settings'] as const,
    get: (key?: string) => ['settings', key ?? 'all'] as const,
  },
  auth: {
    status: ['auth', 'status'] as const,
    profile: ['auth', 'profile'] as const,
  },
  sync: {
    status: (workspaceId: string) => ['sync', 'status', workspaceId] as const,
  },
} as const
