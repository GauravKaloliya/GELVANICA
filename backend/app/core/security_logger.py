import structlog

log = structlog.get_logger("security")


class SecurityLogger:
    def log_auth_failure(self, username: str, reason: str, ip: str, request_id: str | None = None) -> None:
        log.warning(
            "authentication_failure",
            event_type="authentication_failure",
            username=username,
            reason=reason,
            ip=ip,
            request_id=request_id,
        )

    def log_rate_limit_hit(self, endpoint: str, ip: str, request_id: str | None = None) -> None:
        log.info(
            "rate_limit_hit",
            event_type="rate_limit_hit",
            endpoint=endpoint,
            ip=ip,
            request_id=request_id,
        )

    def log_csrf_failure(self, endpoint: str, ip: str, request_id: str | None = None) -> None:
        log.warning(
            "csrf_failure",
            event_type="csrf_failure",
            endpoint=endpoint,
            ip=ip,
            request_id=request_id,
        )

    def log_suspicious_request(self, path: str, reason: str, ip: str, request_id: str | None = None) -> None:
        log.error(
            "suspicious_request",
            event_type="suspicious_request",
            path=path,
            reason=reason,
            ip=ip,
            request_id=request_id,
        )

    def log_privilege_escalation(self, user_id: str, action: str, ip: str, request_id: str | None = None) -> None:
        log.critical(
            "privilege_escalation",
            event_type="privilege_escalation",
            user_id=user_id,
            action=action,
            ip=ip,
            request_id=request_id,
        )


security_logger = SecurityLogger()
