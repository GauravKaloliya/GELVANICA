import type { Endpoint } from '../types';
import { itemEnvelope, listEnvelope, j, authHeader, workspaceId, entityTypeId, entityId, blockId, relationId, tagId, commentId, fileId } from '../common';

export const backupEndpoints: Endpoint[] = [
  {
    id: 'backups-export',
    module: 'Backups',
    method: 'POST',
    path: '/backups/export',
    summary: 'Export workspace',
    description: 'Exports all workspace data as a portable JSON bundle. Includes entities, blocks, relations, tags, branches, versions, and file metadata. Works across local and cloud modes.',
    headers: authHeader,
    requestBody: j({ workspace_id: workspaceId }),
    response: j({
      data: {
        workspace_id: workspaceId,
        exported_at: '2026-06-21T12:30:00Z',
        entity_types: [{ id: entityTypeId, name: 'Page', icon: 'page' }],
        entities: [{ id: entityId, title: 'Research Notes', entity_type_id: entityTypeId }],
        blocks: [{ id: blockId, entity_id: entityId, block_type: 'text', content: { text: 'Hello' } }],
        relations: [{ id: relationId, source_entity_id: entityId, target_entity_id: '2cf8e8f8-b3d2-430c-883a-d68a2bf6cb8b', relation_type: 'refers_to' }],
        tags: [{ id: tagId, name: 'important', color: '#ff4444' }],
        comments: [{ id: commentId, entity_id: entityId, content: 'Looks good' }],
        properties: [{ id: 'd50b44d3-c5e4-407b-a15b-ec5ea6cb9831', name: 'Status', property_type: 'select' }],
        files: [{ id: fileId, file_name: 'diagram.png', mime_type: 'image/png' }],
      },
    }),
  },
  {
    id: 'backups-export-to-disk',
    module: 'Backups',
    method: 'POST',
    path: '/backups/export-to-disk',
    summary: 'Export workspace to disk',
    description: 'Same as export but writes the JSON to instance/backups/ on the server instead of returning it inline. Useful for automated local backups or pre-migration snapshots.',
    headers: authHeader,
    requestBody: j({ workspace_id: workspaceId }),
    response: itemEnvelope({ path: '/path/to/instance/backups/workspace_uuid_20250615_083000.json' }),
  },
  {
    id: 'backups-import',
    module: 'Backups',
    method: 'POST',
    path: '/backups/import',
    summary: 'Import workspace',
    description: 'Imports workspace data from a JSON bundle. Creates entities, blocks, relations, tags, and more from the provided data. Note: the files field in the import body is informational only and is not imported.',
    headers: authHeader,
    requestBody: j({
      workspace_id: workspaceId,
      entities: [{ id: 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3', title: 'Research Notes' }],
      blocks: [],
      relations: [],
      tags: [],
    }),
    response: itemEnvelope({
      workspace_id: workspaceId,
      imported: {
        entity_types: 3,
        entities: 15,
        properties: 6,
        blocks: 120,
        relations: 8,
        tags: 5,
        comments: 2,
      },
    }),
  },
];
