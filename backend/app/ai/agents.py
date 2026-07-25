class BaseAgent:
    def __init__(self, name="agent"):
        self.name = name

    def run(self, task, _context=None):
        return f"[Mock] not_implemented ({self.name}) task={task}"


class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__("supervisor")


class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("planner")


class EditorAgent(BaseAgent):
    def __init__(self):
        super().__init__("editor")


class SearchAgent(BaseAgent):
    def __init__(self):
        super().__init__("search")


class KnowledgeAgent(BaseAgent):
    def __init__(self):
        super().__init__("knowledge")


class GraphAgent(BaseAgent):
    def __init__(self):
        super().__init__("graph")


class FileAgent(BaseAgent):
    def __init__(self):
        super().__init__("file")


class MemoryAgent(BaseAgent):
    def __init__(self):
        super().__init__("memory")


class ToolAgent(BaseAgent):
    def __init__(self):
        super().__init__("tool")


class ResearchAgent(BaseAgent):
    def __init__(self):
        super().__init__("research")


class WritingAgent(BaseAgent):
    def __init__(self):
        super().__init__("writing")


class ReviewAgent(BaseAgent):
    def __init__(self):
        super().__init__("review")


class SummarizationAgent(BaseAgent):
    def __init__(self):
        super().__init__("summarization")


class ClassificationAgent(BaseAgent):
    def __init__(self):
        super().__init__("classification")


class ExtractionAgent(BaseAgent):
    def __init__(self):
        super().__init__("extraction")


class QAAgent(BaseAgent):
    def __init__(self):
        super().__init__("qa")


class CodeGenerationAgent(BaseAgent):
    def __init__(self):
        super().__init__("code_generation")


class CodeReviewAgent(BaseAgent):
    def __init__(self):
        super().__init__("code_review")


class TranslationAgent(BaseAgent):
    def __init__(self):
        super().__init__("translation")
