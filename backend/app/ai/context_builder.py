class ContextBuilder:
    def gather(self, workspace_id, task):
        return {"workspace_id": workspace_id, "task": task, "context": {}}

    def get_workspace_context(self, workspace_id):
        return {"workspace_id": workspace_id, "context": {}}

    def get_entity_context(self, entity_id):
        return {"entity_id": entity_id, "context": {}}
