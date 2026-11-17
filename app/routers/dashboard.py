from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Trip, TripStatus as S, Servicing, Vehicle, User, Role, Advance
from app.security import staff_only, driver_only
from app.services.payroll import month_range, trip_km

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _month(month: Optional[str]):
    month = month or date.today().strftime("%Y-%m")
    try:
        return month, *month_range(month)
    except Exception:
        raise HTTPException(400, "Month must be YYYY-MM")


def _sum(db, col, *filters):
    return float(db.query(func.coalesce(func.sum(col), 0)).filter(*filters).scalar() or 0)


def _money(db, start, end):
    vt = (Trip.status == S.VERIFIED, Trip.trip_date >= start, Trip.trip_date < end)
    income = _sum(db, Trip.trip_amount, *vt)
    salary = _sum(db, Trip.driver_pay, *vt)
    trip_exp = _sum(db, func.coalesce(Trip.fuel_cost, 0) + func.coalesce(Trip.toll_cost, 0)
                    + func.coalesce(Trip.other_cost, 0), *vt)
    service = _sum(db, Servicing.cost, Servicing.service_date >= start, Servicing.service_date < end)
    exp = salary + trip_exp + service
    return {"income": income, "salary": salary, "trip_expenses": trip_exp, "servicing": service,
            "expenses": exp, "profit": income - exp}


@router.get("/owner")
def owner_dashboard(month: Optional[str] = None, db: Session = Depends(get_db),
                    me: User = Depends(staff_only)):
    month, start, end = _month(month)
    today = date.today()
    money = _money(db, start, end)

    trend, y, m = [], start.year, start.month
    for _ in range(6):
        key = f"{y:04d}-{m:02d}"
        s, e = month_range(key)
        mm = _money(db, s, e)
        trend.append({"month": key, "income": mm["income"], "expenses": mm["expenses"], "profit": mm["profit"]})
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    trend.reverse()

    vt = (Trip.status == S.VERIFIED, Trip.trip_date >= start, Trip.trip_date < end)
    by_vehicle = (db.query(Vehicle.reg_no, func.count(Trip.id), func.sum(Trip.trip_amount),
                           func.sum(func.coalesce(Trip.actual_distance_km, Trip.distance_km)))
                  .join(Trip, Trip.vehicle_id == Vehicle.id).filter(*vt)
                  .group_by(Vehicle.reg_no).order_by(func.sum(Trip.trip_amount).desc()).all())
    svc_by_vehicle = dict(db.query(Vehicle.reg_no, func.sum(Servicing.cost))
                          .join(Servicing, Servicing.vehicle_id == Vehicle.id)
                          .filter(Servicing.service_date >= start, Servicing.service_date < end)
                          .group_by(Vehicle.reg_no).all())
    by_driver = (db.query(User.full_name, func.count(Trip.id), func.sum(Trip.driver_pay))
                 .join(Trip, Trip.driver_id == User.id).filter(*vt)
                 .group_by(User.full_name).order_by(func.count(Trip.id).desc()).all())

    soon, soon30 = today + timedelta(days=7), today + timedelta(days=30)
    alerts = []
    for s in db.query(Servicing).filter(Servicing.next_due_date.isnot(None), Servicing.next_due_date <= soon).all():
        newer = db.query(Servicing).filter(Servicing.vehicle_id == s.vehicle_id,
                                           Servicing.service_date > s.service_date).first()
        if not newer:
            alerts.append({"type": "service", "text": f"Service due for {s.vehicle.reg_no} on {s.next_due_date:%d %b}"})
    for v in db.query(Vehicle).filter(Vehicle.status != "INACTIVE").all():
        if v.insurance_expiry and v.insurance_expiry <= soon30:
            alerts.append({"type": "insurance", "text": f"Insurance of {v.reg_no} expires {v.insurance_expiry:%d %b %Y}"})
        if v.fitness_expiry and v.fitness_expiry <= soon30:
            alerts.append({"type": "fitness", "text": f"Fitness of {v.reg_no} expires {v.fitness_expiry:%d %b %Y}"})
    for d in db.query(User).filter(User.role == Role.DRIVER, User.is_active.is_(True)).all():
        if d.license_expiry and d.license_expiry <= soon30:
            alerts.append({"type": "licence", "text": f"Licence of {d.full_name} expires {d.license_expiry:%d %b %Y}"})

    return {
        "month": month, **money,
        "trips_verified": db.query(Trip).filter(*vt).count(),
        "pending_verification": db.query(Trip).filter(Trip.status == S.COMPLETED).count(),
        "running_trips": db.query(Trip).filter(Trip.status == S.STARTED).count(),
        "today_trips": db.query(Trip).filter(Trip.trip_date == today, Trip.status != S.CANCELLED).count(),
        "unpaid_by_customers": _sum(db, Trip.trip_amount, Trip.status == S.VERIFIED, Trip.payment_status == "UNPAID"),
        "active_vehicles": db.query(Vehicle).filter(Vehicle.status == "ACTIVE").count(),
        "active_drivers": db.query(User).filter(User.role == Role.DRIVER, User.is_active.is_(True)).count(),
        "trend": trend,
        "by_vehicle": [{"vehicle": r[0], "trips": r[1], "income": float(r[2] or 0), "km": float(r[3] or 0),
                        "servicing": float(svc_by_vehicle.get(r[0], 0) or 0)} for r in by_vehicle],
        "by_driver": [{"driver": r[0], "trips": r[1], "pay": float(r[2] or 0)} for r in by_driver],
        "alerts": alerts,
    }


@router.get("/driver")
def driver_dashboard(db: Session = Depends(get_db), me: User = Depends(driver_only)):
    month, start, end = _month(None)
    mine = (Trip.driver_id == me.id, Trip.trip_date >= start, Trip.trip_date < end)
    verified = db.query(Trip).filter(*mine, Trip.status == S.VERIFIED).all()
    action = db.query(Trip).filter(Trip.driver_id == me.id, or_(
        Trip.status.in_([S.STARTED, S.REJECTED]),
        and_(Trip.status == S.ASSIGNED, Trip.trip_date <= date.today()))).count()
    return {
        "month": month,
        "verified_trips": len(verified),
        "earned": sum(t.driver_pay or 0 for t in verified),
        "reimbursement": sum((t.fuel_cost or 0) + (t.toll_cost or 0) + (t.other_cost or 0) for t in verified),
        "km": sum(trip_km(t) for t in verified),
        "pending_verification": db.query(Trip).filter(*mine, Trip.status == S.COMPLETED).count(),
        "upcoming": db.query(Trip).filter(Trip.driver_id == me.id, Trip.status == S.ASSIGNED,
                                          Trip.trip_date > date.today()).count(),
        "action_needed": action,
        "open_advances": _sum(db, Advance.amount, Advance.driver_id == me.id, Advance.payroll_id.is_(None)),
    }
