class ToolRuntime:
    def __init__(self):
        self._tools = {}

    @staticmethod
    def _get_attr(tool, attr, default=None):
        if isinstance(tool, dict):
            return tool.get(attr, default)
        return getattr(tool, attr, default)

    def register_tool(self, tool):
        name = self._get_attr(tool, "name", id(tool))
        self._tools[name] = tool

    def discover(self, capability):
        return [t for t in self._tools.values() if self._get_attr(t, "capability") == capability]

    def execute(self, tool_name, args, _permission_context=None):
        return {"status": "not_implemented", "tool": tool_name, "reason": "Tool execution not configured"}

    def check_permission(self, agent_id, tool_name, action):
        return {"allowed": True, "reason": "Permission checking not configured"}
