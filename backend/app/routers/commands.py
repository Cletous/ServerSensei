from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.command import Command
from app.models.device import Device
from app.models.user import User
from app.schemas.command import (
    CommandApprovalDecisionRequest,
    CommandCreateRequest,
    CommandResponse,
    CommandResultRequest,
)
from app.services.audit_service import create_audit_log
from app.services.push_notification_service import (
    send_approval_request_push_notifications,
)

router = APIRouter(
    tags=["Commands"]
)

MANUAL_ONLY_COMMANDS = [
    "fan_on",
    "fan_off",
    "set_fan",
    "turn_fan_on",
    "turn_fan_off",

    "server_on",
    "server_off",
    "set_relay",
    "restart_server",

    "power_on_critical_a",
    "power_off_critical_a",
    "restart_critical_a",
    "power_on_critical_b",
    "power_off_critical_b",
    "restart_critical_b",
    "power_on_non_critical_a",
    "power_off_non_critical_a",
    "restart_non_critical_a",
    "power_on_non_critical_b",
    "power_off_non_critical_b",
    "restart_non_critical_b",

    "restart_all_servers",
    "power_all_servers",
    "shutdown_all_servers",

    "set_load_state",
    "normal",
    "low_runtime",
    "critical_runtime",
    "safe",
    "all_off",
]

def command_requires_manual_mode(action: str) -> bool:
    return action in MANUAL_ONLY_COMMANDS

def build_command_response(command: Command, device: Device) -> CommandResponse:
    return CommandResponse(
        id=command.id,
        device_id=device.device_id,
        action=command.action,
        payload=command.payload,
        status=command.status,

        created_by_user_id=command.created_by_user_id,
        approved_by_user_id=command.approved_by_user_id,
        rejected_by_user_id=command.rejected_by_user_id,

        created_at=command.created_at,
        approved_at=command.approved_at,
        rejected_at=command.rejected_at,
        executed_at=command.executed_at,
    )

def find_device_by_public_id(db: Session, device_id: str) -> Device:
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    return device

def find_command_by_id(db: Session, command_id: int) -> Command:
    command = db.query(Command).filter(
        Command.id == command_id
    ).first()

    if not command:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found"
        )

    return command

@router.post("/commands", response_model=CommandResponse)
def create_command(
    request: CommandCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = find_device_by_public_id(db, request.device_id)

    if command_requires_manual_mode(request.action) and device.mode != "manual":
        create_audit_log(
            db=db,
            user_id=current_user.id,
            device_id=device.id,
            action="MANUAL_COMMAND_BLOCKED",
            entity_type="command",
            entity_id=None,
            description=(
                f"User {current_user.email} attempted manual-only command "
                f"{request.action} while device {device.device_id} was in "
                f"{device.mode} mode"
            ),
            details={
                "command_action": request.action,
                "payload": request.payload,
                "device_id": device.device_id,
                "current_device_mode": device.mode,
                "required_device_mode": "manual",
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This command requires manual mode. "
                "Switch the device to manual mode before sending direct controls."
            )
        )

    if current_user.role == "admin":
        command_status = "pending"
    elif current_user.role in ["operator", "viewer"]:
        command_status = "awaiting_approval"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to request this command"
        )

    command = Command(
        device_id=device.id,
        created_by_user_id=current_user.id,
        action=request.action,
        payload=request.payload,
        status=command_status
    )

    db.add(command)
    db.flush()

    if command_status == "awaiting_approval":
        audit_action = "COMMAND_APPROVAL_REQUESTED"
        description = (
            f"User {current_user.email} requested command "
            f"{request.action} for device {device.device_id}"
        )
    else:
        audit_action = "COMMAND_CREATED"
        description = (
            f"Admin {current_user.email} created command "
            f"{request.action} for device {device.device_id}"
        )

    create_audit_log(
        db=db,
        user_id=current_user.id,
        device_id=device.id,
        action=audit_action,
        entity_type="command",
        entity_id=command.id,
        description=description,
        details={
            "command_action": request.action,
            "command_status": command_status,
            "payload": request.payload,
            "device_id": device.device_id,
        },
    )

    if command_status == "awaiting_approval":
        try:
            send_approval_request_push_notifications(
                db=db,
                command=command,
                device=device,
                requested_by=current_user,
            )
        except Exception as error:
            print(f"[Approval Push Notifications] Failed: {error}")

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
    device = find_device_by_public_id(db, device_id)

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

@router.get(
    "/admin/commands/approvals",
    response_model=list[CommandResponse]
)
def get_commands_awaiting_approval(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    commands = db.query(Command).filter(
        Command.status == "awaiting_approval"
    ).order_by(
        Command.created_at.asc()
    ).all()

    responses = []

    for command in commands:
        device = db.query(Device).filter(
            Device.id == command.device_id
        ).first()

        if device:
            responses.append(build_command_response(command, device))

    return responses

@router.post(
    "/admin/commands/{command_id}/approve",
    response_model=CommandResponse
)
def approve_command(
    command_id: int,
    request: CommandApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    command = find_command_by_id(db, command_id)

    if command.status != "awaiting_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only commands awaiting approval can be approved"
        )

    device = db.query(Device).filter(
        Device.id == command.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    command.status = "pending"
    command.approved_by_user_id = current_user.id
    command.approved_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        user_id=current_user.id,
        device_id=device.id,
        action="COMMAND_APPROVED",
        entity_type="command",
        entity_id=command.id,
        description=(
            f"Admin {current_user.email} approved command "
            f"{command.action} for device {device.device_id}"
        ),
        details={
            "command_action": command.action,
            "payload": command.payload,
            "device_id": device.device_id,
            "requested_by_user_id": command.created_by_user_id,
        },
    )

    db.commit()
    db.refresh(command)

    return build_command_response(command, device)

@router.post(
    "/admin/commands/{command_id}/reject",
    response_model=CommandResponse
)
def reject_command(
    command_id: int,
    request: CommandApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    command = find_command_by_id(db, command_id)

    if command.status != "awaiting_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only commands awaiting approval can be rejected"
        )

    device = db.query(Device).filter(
        Device.id == command.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    command.status = "rejected"
    command.rejected_by_user_id = current_user.id
    command.rejected_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        user_id=current_user.id,
        device_id=device.id,
        action="COMMAND_REJECTED",
        entity_type="command",
        entity_id=command.id,
        description=(
            f"Admin {current_user.email} rejected command "
            f"{command.action} for device {device.device_id}"
        ),
        details={
            "command_action": command.action,
            "payload": command.payload,
            "device_id": device.device_id,
            "requested_by_user_id": command.created_by_user_id,
        },
    )

    db.commit()
    db.refresh(command)

    return build_command_response(command, device)

@router.post("/commands/{command_id}/result", response_model=CommandResponse)
def report_command_result(
    command_id: int,
    request: CommandResultRequest,
    db: Session = Depends(get_db)
):
    command = find_command_by_id(db, command_id)

    allowed_statuses = ["executed", "failed"]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either executed or failed"
        )

    if command.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending commands can be marked as executed or failed"
        )

    device = db.query(Device).filter(
        Device.id == command.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    command.status = request.status
    command.executed_at = datetime.now(timezone.utc)

    create_audit_log(
        db=db,
        user_id=None,
        device_id=device.id,
        action="COMMAND_RESULT_REPORTED",
        entity_type="command",
        entity_id=command.id,
        description=(
            f"Device {device.device_id} reported command "
            f"{command.action} as {request.status}"
        ),
        details={
            "command_action": command.action,
            "result_status": request.status,
            "device_id": device.device_id,
        },
    )

    db.commit()
    db.refresh(command)

    return build_command_response(command, device)