from typing import Dict

from app.core.logging import logger


class SafetyLayer:
    @staticmethod
    def validate_input(text: str) -> bool:
        return True

    @staticmethod
    def sanitize_output(text: str) -> str:
        return text


class AgentRecovery:
    def recover(self, agent_name: str, _error: Exception) -> Dict:
        return {"recovered": False, "fallback": "No recovery strategy configured"}


class AgentMonitoring:
    def record_attempt(self, agent_name: str, task: str):
        """Record an agent attempt."""
        logger.info("agent_attempt", agent_name=agent_name, task=task)

    def record_success(self, agent_name: str, task: str):
        """Record an agent success."""
        logger.info("agent_success", agent_name=agent_name, task=task)

    def record_failure(self, agent_name: str, task: str, error: str):
        """Record an agent failure."""
        logger.error("agent_failure", agent_name=agent_name, task=task, error=error)


class AgentLogs:
    def get_logs(self, agent_name: str, limit: int = 100) -> list:
        return []
