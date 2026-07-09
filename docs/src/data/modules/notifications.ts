import type { Endpoint } from '../types';
import { itemEnvelope, listEnvelope, j, authHeader, paginationParams, pathParam, workspaceParam, workspaceId, userId, entityId, notificationId } from '../common';

export const notificationEndpoints: Endpoint[] = [
  {
    id: 'notifications-list',
    module: 'Notifications',
    method: 'GET',
    path: '/notifications/',
    summary: 'List notifications',
    description: 'Returns notifications filtered by workspace and/or user.',
    headers: authHeader,
    parameters: [
      { ...workspaceParam, required: false },
      { name: 'user_id', type: 'UUID', required: false, description: 'Filter by recipient user.' },
      ...paginationParams,
    ],
    response: listEnvelope([{ id: notificationId, title: 'Mentioned in Research Notes', is_read: false, type: 'mention' }]),
  },
  {
    id: 'notifications-create',
    module: 'Notifications',
    method: 'POST',
    path: '/notifications/',
    summary: 'Create notification',
    description: 'Creates a notification for a user. Notification types: mention, comment, update, invite, system.',
    headers: authHeader,
    requestBody: j({
      workspace_id: workspaceId,
      user_id: userId,
      entity_id: entityId,
      type: 'mention',
      title: 'Mentioned in Research Notes',
      message: 'You were mentioned in a comment.',
    }),
    response: itemEnvelope({ id: notificationId, title: 'Mentioned in Research Notes' }),
  },
  {
    id: 'notifications-read',
    module: 'Notifications',
    method: 'POST',
    path: '/notifications/<id>/read',
    summary: 'Mark notification read',
    description: 'Marks a single notification as read.',
    headers: authHeader,
    parameters: [pathParam('notification_id', 'Notification ID')],
    response: itemEnvelope({ id: notificationId, is_read: true }),
  },
];
