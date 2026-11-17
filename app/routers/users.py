from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Role, Trip, TripStatus, PushSubscription
from app.schemas import UserCreate, UserUpdate, UserOut
from app.security import staff_only, hash_password

router = APIRouter(prefix="/api/users", tags=["Drivers & Users"])


@router.get("", response_model=list[UserOut])
def list_users(role: Optional[str] = None, active: Optional[bool] = None,
               db: Session = Depends(get_db), me: User = Depends(staff_only)):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role.upper())
    if active is not None:
        q = q.filter(User.is_active == active)
    return q.order_by(User.role, User.full_name).all()


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    if data.role == Role.ADMIN and me.role != Role.OWNER:
        raise HTTPException(403, "Only the owner can create admins")
    uname = data.username.lower()
    if db.query(User).filter(User.username == uname).first():
        raise HTTPException(400, "Username already exists")
    if db.query(User).filter(User.phone == data.phone).first():
        raise HTTPException(400, "Phone number already registered")
    fields = {k: v for k, v in data.model_dump(exclude={"password", "username"}).items() if v is not None}
    u = User(**fields, username=uname, password_hash=hash_password(data.password))
    db.add(u); db.commit(); db.refresh(u)
    return u


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db),
                me: User = Depends(staff_only)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if u.role == Role.OWNER and me.role != Role.OWNER:
        raise HTTPException(403, "Cannot edit the owner")
    if u.role == Role.ADMIN and me.role != Role.OWNER and u.id != me.id:
        raise HTTPException(403, "Only the owner can edit admins")
    if u.id == me.id and not data.is_active:
        raise HTTPException(400, "You cannot disable your own account")
    if u.role == Role.DRIVER and not data.license_no:
        raise HTTPException(400, "License number is required for drivers")
    if db.query(User).filter(User.phone == data.phone, User.id != u.id).first():
        raise HTTPException(400, "Phone number already registered")
    if u.role == Role.DRIVER and not data.is_active:
        open_trips = db.query(Trip).filter(Trip.driver_id == u.id,
                                           Trip.status.in_([TripStatus.ASSIGNED, TripStatus.STARTED])).count()
        if open_trips:
            raise HTTPException(400, f"Driver has {open_trips} open trip(s). Reassign or cancel them first.")
    for k, v in data.model_dump(exclude={"new_password"}).items():
        if k == "joined_on" and v is None:
            continue
        setattr(u, k, v)
    if data.new_password:
        u.password_hash = hash_password(data.new_password)
    if not u.is_active:  # disabled user stops receiving phone alerts
        db.query(PushSubscription).filter(PushSubscription.user_id == u.id).delete()
    db.commit(); db.refresh(u)
    return u
