from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Trip, TripStatus as S, User, Role, Vehicle, Customer
from app.schemas import TripIn, TripStart, TripEnd, TripReject, TripOut
from app.security import get_current_user, staff_only
from app.services.notify import notify
from app.services.payroll import is_month_locked, month_range

router = APIRouter(prefix="/api/trips", tags=["Trips"])


def out(t: Trip) -> TripOut:
    o = TripOut.model_validate(t)
    o.driver_name = t.driver.full_name if t.driver else None
    o.vehicle_no = t.vehicle.reg_no if t.vehicle else None
    o.customer_name = t.customer.name if t.customer else None
    return o


def _get(db: Session, trip_id: int) -> Trip:
    t = db.get(Trip, trip_id)
    if not t:
        raise HTTPException(404, "Trip not found")
    return t


def _can_operate(user: User, t: Trip):
    """Driver can operate only own trip; Owner/Admin can act on behalf of the driver."""
    if user.role == Role.DRIVER and t.driver_id != user.id:
        raise HTTPException(403, "This trip is not assigned to you")


def _by(user: User, t: Trip) -> str:
    return t.driver.full_name if user.role == Role.DRIVER else f"{user.full_name} (for {t.driver.full_name})"


def _route(t: Trip) -> str:
    return f"{t.trip_name} · {t.origin} → {t.destination} on {t.trip_date:%d %b}"


def _validate_refs(db: Session, data: TripIn):
    d = db.get(User, data.driver_id)
    if not d or d.role != Role.DRIVER or not d.is_active:
        raise HTTPException(400, "Select an active driver")
    if d.license_expiry and d.license_expiry < data.trip_date:
        raise HTTPException(400, f"{d.full_name}'s licence expires before the trip date")
    v = db.get(Vehicle, data.vehicle_id)
    if not v or v.status != "ACTIVE":
        raise HTTPException(400, "Selected vehicle is not active (in service / inactive)")
    if v.insurance_expiry and v.insurance_expiry < data.trip_date:
        raise HTTPException(400, f"Insurance of {v.reg_no} expires before the trip date")
    c = db.get(Customer, data.customer_id)
    if not c or not c.is_active:
        raise HTTPException(400, "Select an active customer")
    if is_month_locked(db, data.driver_id, data.trip_date):
        raise HTTPException(400, "Salary for that month is already paid to this driver")


# ---------------- list ----------------
@router.get("", response_model=list[TripOut])
def list_trips(status: Optional[str] = None, month: Optional[str] = None,
               driver_id: Optional[int] = None, vehicle_id: Optional[int] = None,
               customer_id: Optional[int] = None, payment_status: Optional[str] = None,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Trip)
    if user.role == Role.DRIVER:
        q = q.filter(Trip.driver_id == user.id)
    elif driver_id:
        q = q.filter(Trip.driver_id == driver_id)
    if status:
        q = q.filter(Trip.status.in_([s.strip() for s in status.upper().split(",")]))
    if month:
        try:
            start, end = month_range(month)
        except Exception:
            raise HTTPException(400, "Month must be YYYY-MM")
        q = q.filter(Trip.trip_date >= start, Trip.trip_date < end)
    if vehicle_id:
        q = q.filter(Trip.vehicle_id == vehicle_id)
    if customer_id:
        q = q.filter(Trip.customer_id == customer_id)
    if payment_status:
        q = q.filter(Trip.payment_status == payment_status.upper())
    return [out(t) for t in q.order_by(Trip.trip_date.desc(), Trip.id.desc()).limit(500).all()]


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = _get(db, trip_id)
    _can_operate(user, t)
    return out(t)


# ---------------- admin ----------------
@router.post("", response_model=TripOut)
def create_trip(data: TripIn, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    _validate_refs(db, data)
    t = Trip(**data.model_dump(), status=S.ASSIGNED)
    db.add(t); db.flush(); db.refresh(t)
    notify(db, _route(t), user_id=t.driver_id, link="#/home", important=True, title="New trip assigned")
    db.commit(); db.refresh(t)
    return out(t)


@router.put("/{trip_id}", response_model=TripOut)
def update_trip(trip_id: int, data: TripIn, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    t = _get(db, trip_id)
    if t.status in (S.VERIFIED, S.CANCELLED):
        raise HTTPException(400, f"{t.status.title()} trips cannot be edited")
    if t.status != S.ASSIGNED and (data.driver_id != t.driver_id or data.vehicle_id != t.vehicle_id):
        raise HTTPException(400, "Driver/vehicle can be changed only before the trip starts")
    _validate_refs(db, data)
    old_driver = t.driver_id
    changed = (t.trip_date, t.origin, t.destination, t.vehicle_id) != \
              (data.trip_date, data.origin, data.destination, data.vehicle_id)
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    db.flush(); db.refresh(t)
    if old_driver != t.driver_id:
        notify(db, f"Trip {t.trip_name} was given to another driver", user_id=old_driver,
               link="#/my-trips", important=True, title="Trip reassigned")
        notify(db, _route(t), user_id=t.driver_id, link="#/home", important=True, title="New trip assigned")
    elif changed:
        notify(db, f"{_route(t)} · {t.vehicle.reg_no}", user_id=t.driver_id, link="#/home",
               important=True, title="Trip updated")
    db.commit(); db.refresh(t)
    return out(t)


@router.post("/{trip_id}/verify", response_model=TripOut)
def verify_trip(trip_id: int, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    t = _get(db, trip_id)
    if t.status != S.COMPLETED:
        raise HTTPException(400, "Only completed trips can be verified")
    if is_month_locked(db, t.driver_id, t.trip_date):
        raise HTTPException(400, "Salary for that month is already paid")
    t.status, t.verified_by, t.verified_at, t.remarks = S.VERIFIED, me.id, datetime.utcnow(), None
    if t.end_odometer and t.end_odometer > (t.vehicle.odometer_km or 0):
        t.vehicle.odometer_km = t.end_odometer
    notify(db, f"Trip verified: {t.trip_name} (₹{t.driver_pay:,.0f} added to earnings)",
           user_id=t.driver_id, link="#/earnings")
    db.commit(); db.refresh(t)
    return out(t)


@router.post("/{trip_id}/reject", response_model=TripOut)
def reject_trip(trip_id: int, data: TripReject, db: Session = Depends(get_db),
                me: User = Depends(staff_only)):
    t = _get(db, trip_id)
    if t.status != S.COMPLETED:
        raise HTTPException(400, "Only completed trips can be sent back")
    t.status, t.remarks = S.REJECTED, data.remarks.strip()
    notify(db, f"{t.trip_name}. Reason: {t.remarks}", user_id=t.driver_id, link="#/home",
           important=True, title="Trip sent back")
    db.commit(); db.refresh(t)
    return out(t)


@router.post("/{trip_id}/cancel", response_model=TripOut)
def cancel_trip(trip_id: int, data: TripReject, db: Session = Depends(get_db),
                me: User = Depends(staff_only)):
    t = _get(db, trip_id)
    if t.status not in (S.ASSIGNED, S.STARTED, S.REJECTED):
        raise HTTPException(400, f"{t.status.title()} trips cannot be cancelled")
    t.status, t.remarks = S.CANCELLED, data.remarks.strip()
    notify(db, f"{t.trip_name} was cancelled. Reason: {t.remarks}", user_id=t.driver_id,
           link="#/my-trips", important=True, title="Trip cancelled")
    db.commit(); db.refresh(t)
    return out(t)


@router.post("/{trip_id}/payment", response_model=TripOut)
def toggle_payment(trip_id: int, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    t = _get(db, trip_id)
    if t.status != S.VERIFIED:
        raise HTTPException(400, "Only verified trips can be marked paid")
    t.payment_status = "UNPAID" if t.payment_status == "PAID" else "PAID"
    db.commit(); db.refresh(t)
    return out(t)


# ---------------- start / end (driver, or admin on behalf) ----------------
@router.post("/{trip_id}/start", response_model=TripOut)
def start_trip(trip_id: int, data: Optional[TripStart] = None, db: Session = Depends(get_db),
               me: User = Depends(get_current_user)):
    data = data or TripStart()
    t = _get(db, trip_id)
    _can_operate(me, t)
    if t.status != S.ASSIGNED:
        raise HTTPException(400, f"Trip is {t.status.lower()}, cannot start")
    if t.trip_date > date.today():
        raise HTTPException(400, f"This trip is scheduled for {t.trip_date:%d %b %Y}")
    running = db.query(Trip).filter(Trip.driver_id == t.driver_id, Trip.status == S.STARTED).first()
    if running:
        raise HTTPException(400, f"Finish the running trip '{running.trip_name}' first")
    busy = db.query(Trip).filter(Trip.vehicle_id == t.vehicle_id, Trip.status == S.STARTED).first()
    if busy:
        raise HTTPException(400, f"Vehicle {t.vehicle.reg_no} is already on another trip")
    if t.vehicle.status != "ACTIVE":
        raise HTTPException(400, f"Vehicle {t.vehicle.reg_no} is not available. Contact admin.")
    t.status, t.started_at, t.start_odometer = S.STARTED, datetime.utcnow(), data.start_odometer
    notify(db, f"{_by(me, t)} started trip {t.trip_name}", link="#/trips?status=STARTED")
    if me.role != Role.DRIVER:
        notify(db, f"{t.trip_name} was started by office", user_id=t.driver_id, link="#/home",
               important=True, title="Trip started by office")
    db.commit(); db.refresh(t)
    return out(t)


@router.post("/{trip_id}/end", response_model=TripOut)
def end_trip(trip_id: int, data: Optional[TripEnd] = None, db: Session = Depends(get_db),
             me: User = Depends(get_current_user)):
    """End a running trip (or resubmit a sent-back trip). Odometer & km are optional:
    distance = end - start odometer (if both) > actual km entered > planned km."""
    data = data or TripEnd()
    t = _get(db, trip_id)
    _can_operate(me, t)
    if t.status not in (S.STARTED, S.REJECTED):
        raise HTTPException(400, f"Trip is {t.status.lower()}. Only a started trip can be ended")

    start_odo = t.start_odometer
    km = None
    if data.end_odometer is not None and start_odo is not None:
        if data.end_odometer < start_odo:
            raise HTTPException(400, f"End odometer ({data.end_odometer:,.0f}) cannot be less than "
                                     f"start odometer ({start_odo:,.0f})")
        km = round(data.end_odometer - start_odo, 1)
        if km > 5000:
            raise HTTPException(400, "Distance looks wrong (more than 5000 km). Check the odometer reading.")
    if km is None and data.actual_distance_km is not None:
        km = data.actual_distance_km
    if km is None:
        km = t.distance_km

    resubmit = t.status == S.REJECTED
    t.end_odometer, t.actual_distance_km = data.end_odometer, km
    t.fuel_cost, t.toll_cost, t.other_cost = data.fuel_cost, data.toll_cost, data.other_cost
    t.driver_notes = (data.driver_notes or "").strip() or None
    t.status = S.COMPLETED
    if not resubmit or not t.ended_at:
        t.ended_at = datetime.utcnow()
    exp = (t.fuel_cost or 0) + (t.toll_cost or 0) + (t.other_cost or 0)
    notify(db, f"{_by(me, t)} {'resubmitted' if resubmit else 'completed'} {t.trip_name} · "
               f"{km:g} km{f' · expenses ₹{exp:,.0f}' if exp else ''}",
           link="#/trips?status=COMPLETED", important=True, title="Trip to verify")
    if me.role != Role.DRIVER:
        notify(db, f"{t.trip_name} was ended by office", user_id=t.driver_id,
               link="#/my-trips", important=True, title="Trip ended by office")
    db.commit(); db.refresh(t)
    return out(t)
