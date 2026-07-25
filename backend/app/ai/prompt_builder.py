class PromptBuilder:
    def build(self, _memory, knowledge, task):
        return f"Task: {task}\n\nContext: {knowledge}"

    def build_system_prompt(self, agent_type, context):
        return f"You are a {agent_type} agent. Context: {context}"

    def build_query_prompt(self, question, context):
        return f"Question: {question}\n\nContext: {context}"
