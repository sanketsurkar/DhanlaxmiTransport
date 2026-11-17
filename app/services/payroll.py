from datetime import date, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import Trip, TripStatus, Advance, Payroll, User, Role
from app.services.notify import notify


def month_range(month: str):
    y, m = map(int, month.split("-"))
    if not 1 <= m <= 12:
        raise ValueError("bad month")
    return date(y, m, 1), date(y + (m == 12), m % 12 + 1, 1)


def trips_in_month(db: Session, driver_id: int, month: str, statuses):
    start, end = month_range(month)
    return (db.query(Trip).filter(Trip.driver_id == driver_id, Trip.status.in_(statuses),
                                  Trip.trip_date >= start, Trip.trip_date < end).all())


def is_month_locked(db: Session, driver_id: int, d: date) -> bool:
    p = db.query(Payroll).filter(Payroll.driver_id == driver_id,
                                 Payroll.month == d.strftime("%Y-%m")).first()
    return bool(p and p.status == "PAID")


def trip_km(t: Trip) -> float:
    return t.actual_distance_km if t.actual_distance_km is not None else (t.distance_km or 0)


def compute(db: Session, p: Payroll):
    trips = trips_in_month(db, p.driver_id, p.month, [TripStatus.VERIFIED])
    _, end = month_range(p.month)
    p.trip_count = len(trips)
    p.days_worked = len({t.trip_date for t in trips})
    p.total_km = round(sum(trip_km(t) for t in trips), 1)
    p.trip_pay = round(sum(t.driver_pay or 0 for t in trips), 2)
    p.reimbursement = round(sum((t.fuel_cost or 0) + (t.toll_cost or 0) + (t.other_cost or 0)
                                for t in trips), 2)
    for a in db.query(Advance).filter(Advance.payroll_id == p.id).all():
        a.payroll_id = None
    db.flush()
    open_adv = db.query(Advance).filter(Advance.driver_id == p.driver_id,
                                        Advance.payroll_id.is_(None),
                                        Advance.given_on < end).all()
    for a in open_adv:
        a.payroll_id = p.id
    p.advance_deduction = round(sum(a.amount for a in open_adv), 2)
    p.net_pay = round(p.trip_pay + p.reimbursement + (p.bonus or 0)
                      - p.advance_deduction - (p.other_deduction or 0), 2)


def generate_month(db: Session, month: str):
    results = []
    for d in db.query(User).filter(User.role == Role.DRIVER).order_by(User.full_name).all():
        p = db.query(Payroll).filter(Payroll.driver_id == d.id, Payroll.month == month).first()
        if p and p.status == "PAID":
            results.append(p)
            continue
        if not p and not trips_in_month(db, d.id, month, [TripStatus.VERIFIED]):
            continue
        if not p:
            p = Payroll(driver_id=d.id, month=month, bonus=0, other_deduction=0)
            db.add(p)
            db.flush()
        compute(db, p)
        results.append(p)
    db.commit()
    return results


def mark_paid(db: Session, p: Payroll):
    if p.status == "PAID":
        raise HTTPException(400, "Already paid")
    pending = trips_in_month(db, p.driver_id, p.month, [TripStatus.COMPLETED, TripStatus.STARTED])
    if pending:
        raise HTTPException(400, f"{len(pending)} trip(s) of this driver in {p.month} are not verified yet. "
                                 "Verify or send them back first.")
    compute(db, p)
    if p.net_pay < 0:
        raise HTTPException(400, "Net pay is negative. Reduce deductions first.")
    p.status = "PAID"
    p.paid_at = datetime.utcnow()
    notify(db, f"Salary for {p.month}: ₹{p.net_pay:,.0f}", user_id=p.driver_id,
           link="#/earnings", important=True, title="Salary paid")
    db.commit()
    return p
