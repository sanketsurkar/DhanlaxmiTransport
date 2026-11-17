from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payroll, User, Role
from app.schemas import PayrollGenerate, PayrollAdjust, PayrollOut
from app.security import staff_only, get_current_user
from app.services import payroll as svc

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])


def out(p: Payroll):
    o = PayrollOut.model_validate(p)
    o.driver_name = p.driver.full_name if p.driver else None
    return o


@router.get("", response_model=list[PayrollOut])
def list_payroll(month: Optional[str] = None, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    q = db.query(Payroll)
    if user.role == Role.DRIVER:
        q = q.filter(Payroll.driver_id == user.id)
    if month:
        q = q.filter(Payroll.month == month)
    return [out(p) for p in q.order_by(Payroll.month.desc(), Payroll.id).all()]


@router.post("/generate", response_model=list[PayrollOut])
def generate(data: PayrollGenerate, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    return [out(p) for p in svc.generate_month(db, data.month)]


@router.put("/{pid}", response_model=PayrollOut)
def adjust(pid: int, data: PayrollAdjust, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    p = db.get(Payroll, pid)
    if not p:
        raise HTTPException(404, "Payroll not found")
    if p.status == "PAID":
        raise HTTPException(400, "Paid payroll cannot be changed")
    p.bonus, p.other_deduction = data.bonus, data.other_deduction
    svc.compute(db, p)
    db.commit(); db.refresh(p)
    return out(p)


@router.post("/{pid}/pay", response_model=PayrollOut)
def pay(pid: int, db: Session = Depends(get_db), me: User = Depends(staff_only)):
    p = db.get(Payroll, pid)
    if not p:
        raise HTTPException(404, "Payroll not found")
    return out(svc.mark_paid(db, p))
