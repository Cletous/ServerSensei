from typing import Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def create_audit_log(
    db: Session,
    action: str,
    description: str,
    user_id: int | None = None,
    device_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        user_id=user_id,
        device_id=device_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        details=details,
    )

    db.add(audit_log)

    return audit_log