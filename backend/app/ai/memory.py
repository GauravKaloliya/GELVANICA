class AgentMemory:
    def __init__(self, agent_id="default"):
        self.agent_id = agent_id
        self._short_term = []
        self._long_term = []
        self._conversation = []
        self._workspace_context = {}
        self._shared = {}

    def store(self, key, value):
        """Store a value in short-term memory by key."""
        self._short_term.append({"key": key, "value": value})

    def retrieve(self, key):
        """Retrieve a value from short-term memory by key."""
        for item in reversed(self._short_term):
            if item.get("key") == key:
                return item["value"]
        return None

    def store_short_term(self, data):
        self._short_term.append(data)

    def retrieve_short_term(self):
        return self._short_term

    def store_long_term(self, data):
        self._long_term.append(data)

    def retrieve_long_term(self, _query=None):
        return self._long_term

    def store_conversation(self, entry):
        self._conversation.append(entry)

    def get_conversation_history(self, limit=15):
        return self._conversation[-limit:]

    def set_workspace_context(self, context):
        self._workspace_context = context

    def get_workspace_context(self):
        return self._workspace_context

    def sync_to_shared(self, key, value):
        self._shared[key] = value

    def clear(self):
        self._short_term.clear()
        self._long_term.clear()
        self._conversation.clear()
        self._workspace_context.clear()
        self._shared.clear()
