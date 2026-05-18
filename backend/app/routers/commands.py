from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.command import Command
from app.models.device import Device
from app.models.user import User
from app.schemas.command import (
    CommandCreateRequest,
    CommandResponse,
    CommandResultRequest,
)

router = APIRouter(
    tags=["Commands"]
)

def build_command_response(command: Command, device: Device) -> CommandResponse:
    return CommandResponse(
        id=command.id,
        device_id=device.device_id,
        action=command.action,
        payload=command.payload,
        status=command.status,
        created_at=command.created_at,
        executed_at=command.executed_at
    )

@router.post("/commands", response_model=CommandResponse)
def create_command(
    request: CommandCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    device = db.query(Device).filter(
        Device.device_id == request.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    command = Command(
        device_id=device.id,
        created_by_user_id=current_user.id,
        action=request.action,
        payload=request.payload,
        status="pending"
    )

    db.add(command)
    db.commit()
    db.refresh(command)

    return build_command_response(command, device)

@router.get(
    "/devices/{device_id}/commands/pending",
    response_model=list[CommandResponse]
)
def get_pending_commands(
    device_id: str,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    commands = db.query(Command).filter(
        Command.device_id == device.id,
        Command.status == "pending"
    ).order_by(
        Command.created_at.asc()
    ).all()

    return [
        build_command_response(command, device)
        for command in commands
    ]

@router.post("/commands/{command_id}/result", response_model=CommandResponse)
def report_command_result(
    command_id: int,
    request: CommandResultRequest,
    db: Session = Depends(get_db)
):
    command = db.query(Command).filter(
        Command.id == command_id
    ).first()

    if not command:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found"
        )

    allowed_statuses = ["executed", "failed"]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either executed or failed"
        )

    device = db.query(Device).filter(
        Device.id == command.device_id
    ).first()

    command.status = request.status
    command.executed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(command)

    return build_command_response(command, device)