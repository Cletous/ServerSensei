from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse

router = APIRouter(
    prefix="/admin/audit-logs",
    tags=["Audit Logs"]
)

@router.get("", response_model=list[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    return db.query(AuditLog).order_by(
        AuditLog.created_at.desc()
    ).limit(limit).all()