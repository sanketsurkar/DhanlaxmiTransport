"""Vehicles, Customers, Servicing and Advances."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vehicle, Customer, Servicing, Advance, Trip, TripStatus, User, Role
from app.schemas import (VehicleIn, VehicleOut, CustomerIn, CustomerOut, ServicingIn,
                         ServicingOut, AdvanceIn, AdvanceOut)
from app.security import staff_only
from app.services.notify import notify

router = APIRouter(prefix="/api", tags=["Masters"], dependencies=[Depends(staff_only)])


def _get(db, model, id_, name):
    obj = db.get(model, id_)
    if not obj:
        raise HTTPException(404, f"{name} not found")
    return obj


# ---------- Vehicles ----------
@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.reg_no).all()


def _save_vehicle(db, v: Vehicle, data: VehicleIn):
    dup = db.query(Vehicle).filter(Vehicle.reg_no == data.reg_no, Vehicle.id != (v.id or 0)).first()
    if dup:
        raise HTTPException(400, "Vehicle with this registration number already exists")
    if v.id and data.status != "ACTIVE":
        if db.query(Trip).filter(Trip.vehicle_id == v.id, Trip.status == TripStatus.STARTED).count():
            raise HTTPException(400, "Vehicle is on a running trip. End the trip first.")
    for k, val in data.model_dump().items():
        setattr(v, k, val)
    db.add(v); db.commit(); db.refresh(v)
    return v


@router.post("/vehicles", response_model=VehicleOut)
def create_vehicle(data: VehicleIn, db: Session = Depends(get_db)):
    return _save_vehicle(db, Vehicle(), data)


@router.put("/vehicles/{vid}", response_model=VehicleOut)
def update_vehicle(vid: int, data: VehicleIn, db: Session = Depends(get_db)):
    return _save_vehicle(db, _get(db, Vehicle, vid, "Vehicle"), data)


# ---------- Customers ----------
@router.get("/customers", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name).all()


@router.post("/customers", response_model=CustomerOut)
def create_customer(data: CustomerIn, db: Session = Depends(get_db)):
    if db.query(Customer).filter(Customer.name.ilike(data.name)).first():
        raise HTTPException(400, "Customer with this name already exists")
    c = Customer(**data.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.put("/customers/{cid}", response_model=CustomerOut)
def update_customer(cid: int, data: CustomerIn, db: Session = Depends(get_db)):
    c = _get(db, Customer, cid, "Customer")
    if db.query(Customer).filter(Customer.name.ilike(data.name), Customer.id != cid).first():
        raise HTTPException(400, "Customer with this name already exists")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c


# ---------- Servicing ----------
def _svc_out(s: Servicing):
    o = ServicingOut.model_validate(s)
    o.vehicle_no = s.vehicle.reg_no if s.vehicle else None
    return o


@router.get("/servicing", response_model=list[ServicingOut])
def list_servicing(vehicle_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Servicing)
    if vehicle_id:
        q = q.filter(Servicing.vehicle_id == vehicle_id)
    return [_svc_out(s) for s in q.order_by(Servicing.service_date.desc()).all()]


def _save_service(db, s: Servicing, data: ServicingIn):
    v = _get(db, Vehicle, data.vehicle_id, "Vehicle")
    for k, val in data.model_dump().items():
        setattr(s, k, val)
    if data.odometer_km and data.odometer_km > (v.odometer_km or 0):
        v.odometer_km = data.odometer_km
    db.add(s); db.commit(); db.refresh(s)
    return _svc_out(s)


@router.post("/servicing", response_model=ServicingOut)
def create_service(data: ServicingIn, db: Session = Depends(get_db)):
    return _save_service(db, Servicing(), data)


@router.put("/servicing/{sid}", response_model=ServicingOut)
def update_service(sid: int, data: ServicingIn, db: Session = Depends(get_db)):
    return _save_service(db, _get(db, Servicing, sid, "Service record"), data)


@router.delete("/servicing/{sid}")
def delete_service(sid: int, db: Session = Depends(get_db)):
    db.delete(_get(db, Servicing, sid, "Service record")); db.commit()
    return {"ok": True}


# ---------- Advances ----------
def _adv_out(a: Advance):
    o = AdvanceOut.model_validate(a)
    o.driver_name = a.driver.full_name if a.driver else None
    return o


@router.get("/advances", response_model=list[AdvanceOut])
def list_advances(db: Session = Depends(get_db)):
    return [_adv_out(a) for a in db.query(Advance).order_by(Advance.given_on.desc()).all()]


def _save_adv(db, a: Advance, data: AdvanceIn):
    if a.payroll_id:
        raise HTTPException(400, "Advance already adjusted in payroll; cannot change")
    d = _get(db, User, data.driver_id, "Driver")
    if d.role != Role.DRIVER:
        raise HTTPException(400, "Advances can be given only to drivers")
    if data.given_on > date.today():
        raise HTTPException(400, "Date cannot be in the future")
    new = a.id is None
    for k, v in data.model_dump().items():
        setattr(a, k, v)
    db.add(a)
    if new:
        notify(db, f"Advance of ₹{a.amount:,.0f} recorded. It will be adjusted in salary.",
               user_id=a.driver_id, link="#/earnings")
    db.commit(); db.refresh(a)
    return _adv_out(a)


@router.post("/advances", response_model=AdvanceOut)
def create_advance(data: AdvanceIn, db: Session = Depends(get_db)):
    return _save_adv(db, Advance(), data)


@router.put("/advances/{aid}", response_model=AdvanceOut)
def update_advance(aid: int, data: AdvanceIn, db: Session = Depends(get_db)):
    return _save_adv(db, _get(db, Advance, aid, "Advance"), data)


@router.delete("/advances/{aid}")
def delete_advance(aid: int, db: Session = Depends(get_db)):
    a = _get(db, Advance, aid, "Advance")
    if a.payroll_id:
        raise HTTPException(400, "Advance already adjusted in payroll; cannot delete")
    db.delete(a); db.commit()
    return {"ok": True}
