import type { Endpoint } from '../types';
import { j, authHeader, snapshotId, changesetId, versionId, branchId } from '../common';

export const diffEndpoints: Endpoint[] = [
  {
    id: 'diffs-compare',
    module: 'Diffs',
    method: 'POST',
    path: '/diffs/compare',
    summary: 'Compare snapshots or branches',
    description: 'Returns a structured diff between two snapshots or branches. Shows added, removed, and modified blocks with their content changes. Ideal for building visual diff viewers.',
    availability: 'cloud-only',
    headers: authHeader,
    requestBody: j({
      left_snapshot_id: snapshotId,
      right_snapshot_id: '36fa4408-9cf7-41a8-920e-adc42c91a1d9',
    }),
    response: j({
      data: [
        { type: 'added', entity_id: 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3', block_id: '4ef014a4-569d-4cf9-98fe-d2784860b263', after: { text: 'New section' } },
        { type: 'removed', entity_id: 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3', block_id: '5a3978e0-dfeb-475d-911e-5451dd808dad', before: { text: 'Old section' } },
        { type: 'modified', entity_id: 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3', block_id: '4ef014a4-569d-4cf9-98fe-d2784860b263', field: 'content', before: { text: 'Before' }, after: { text: 'After' } },
      ],
    }),
  },
];
