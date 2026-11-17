import re
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator

PHONE_RE = re.compile(r"^[6-9]\d{9}$")
REG_RE = re.compile(r"^[A-Z0-9]{6,12}$")
GST_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$")
MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _clean(v):
    return (v.strip() or None) if isinstance(v, str) else v


def check_phone(v: str) -> str:
    v = re.sub(r"[\s-]", "", v or "")
    if v.startswith("+91"):
        v = v[3:]
    if not PHONE_RE.match(v):
        raise ValueError("Enter a valid 10-digit mobile number")
    return v


class ORM(BaseModel):
    model_config = {"from_attributes": True}


# ---------------- Auth ----------------
class LoginIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=100)


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=100)


# ---------------- Users / Drivers ----------------
class UserBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str
    license_no: Optional[str] = Field(default=None, max_length=30)
    license_expiry: Optional[date] = None
    address: Optional[str] = Field(default=None, max_length=250)
    joined_on: Optional[date] = None
    is_active: bool = True

    _strip = field_validator("full_name", "license_no", "address", mode="before")(_clean)

    @field_validator("phone")
    @classmethod
    def v_phone(cls, v):
        return check_phone(v)


class UserCreate(UserBase):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.]+$")
    password: str = Field(min_length=6, max_length=100)
    role: str = "DRIVER"

    @field_validator("role")
    @classmethod
    def v_role(cls, v):
        if v not in ("ADMIN", "DRIVER"):
            raise ValueError("Role must be ADMIN or DRIVER")
        return v

    @model_validator(mode="after")
    def driver_needs_license(self):
        if self.role == "DRIVER" and not self.license_no:
            raise ValueError("License number is required for drivers")
        return self


class UserUpdate(UserBase):
    new_password: Optional[str] = Field(default=None, max_length=100)

    @field_validator("new_password")
    @classmethod
    def v_pw(cls, v):
        if v and len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v or None


class UserOut(ORM):
    id: int
    username: str
    full_name: str
    phone: str
    role: str
    is_active: bool
    license_no: Optional[str]
    license_expiry: Optional[date]
    address: Optional[str]
    joined_on: Optional[date]
    last_login: Optional[datetime]


# ---------------- Vehicles ----------------
class VehicleIn(BaseModel):
    reg_no: str
    vehicle_type: str = Field(min_length=2, max_length=30)
    model: Optional[str] = Field(default=None, max_length=60)
    capacity: Optional[str] = Field(default=None, max_length=30)
    status: str = "ACTIVE"
    odometer_km: Optional[float] = Field(default=0, ge=0, le=5_000_000)
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None

    @field_validator("reg_no")
    @classmethod
    def v_reg(cls, v):
        v = re.sub(r"[\s-]", "", v or "").upper()
        if not REG_RE.match(v):
            raise ValueError("Enter a valid registration number, e.g. MH31AB1234")
        return v

    @field_validator("status")
    @classmethod
    def v_status(cls, v):
        if v not in ("ACTIVE", "IN_SERVICE", "INACTIVE"):
            raise ValueError("Invalid vehicle status")
        return v

    @field_validator("odometer_km")
    @classmethod
    def v_odo(cls, v):
        return v or 0


class VehicleOut(ORM, VehicleIn):
    id: int


# ---------------- Customers ----------------
class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    contact_person: Optional[str] = Field(default=None, max_length=100)
    phone: str
    email: Optional[str] = Field(default=None, max_length=120)
    address: Optional[str] = Field(default=None, max_length=250)
    gstin: Optional[str] = None
    is_active: bool = True

    _strip = field_validator("name", "contact_person", "address", mode="before")(_clean)

    @field_validator("phone")
    @classmethod
    def v_phone(cls, v):
        return check_phone(v)

    @field_validator("email")
    @classmethod
    def v_email(cls, v):
        v = (v or "").strip()
        if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Enter a valid email")
        return v or None

    @field_validator("gstin")
    @classmethod
    def v_gst(cls, v):
        v = (v or "").strip().upper()
        if v and not GST_RE.match(v):
            raise ValueError("Enter a valid 15-character GSTIN")
        return v or None


class CustomerOut(ORM):
    id: int
    name: str
    contact_person: Optional[str]
    phone: str
    email: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    is_active: bool


# ---------------- Trips ----------------
class TripIn(BaseModel):
    trip_name: str = Field(min_length=2, max_length=150)
    trip_date: date
    driver_id: int
    vehicle_id: int
    customer_id: int
    origin: str = Field(min_length=2, max_length=100)
    destination: str = Field(min_length=2, max_length=100)
    distance_km: float = Field(gt=0, le=5000)
    trip_amount: float = Field(ge=0, le=10_000_000)
    driver_pay: float = Field(ge=0, le=1_000_000)

    _strip = field_validator("trip_name", "origin", "destination", mode="before")(_clean)

    @model_validator(mode="after")
    def rules(self):
        if self.trip_amount and self.driver_pay > self.trip_amount:
            raise ValueError("Driver pay cannot be more than trip amount")
        if self.origin.lower() == self.destination.lower():
            raise ValueError("Origin and destination cannot be same")
        return self


class TripStart(BaseModel):
    start_odometer: Optional[float] = Field(default=None, ge=0, le=5_000_000)


class TripEnd(BaseModel):
    """Everything optional. Distance priority: odometer diff > actual km > planned km."""
    end_odometer: Optional[float] = Field(default=None, ge=0, le=5_000_000)
    actual_distance_km: Optional[float] = Field(default=None, ge=0, le=5000)
    fuel_cost: Optional[float] = Field(default=0, ge=0, le=500_000)
    toll_cost: Optional[float] = Field(default=0, ge=0, le=100_000)
    other_cost: Optional[float] = Field(default=0, ge=0, le=100_000)
    driver_notes: Optional[str] = Field(default=None, max_length=300)

    @field_validator("fuel_cost", "toll_cost", "other_cost")
    @classmethod
    def zero(cls, v):
        return v or 0


class TripReject(BaseModel):
    remarks: str = Field(min_length=3, max_length=300)


class TripOut(ORM):
    id: int
    trip_name: str
    trip_date: date
    driver_id: int
    vehicle_id: int
    customer_id: int
    driver_name: Optional[str] = None
    vehicle_no: Optional[str] = None
    customer_name: Optional[str] = None
    origin: str
    destination: str
    distance_km: float
    trip_amount: float
    driver_pay: float
    start_odometer: Optional[float]
    end_odometer: Optional[float]
    actual_distance_km: Optional[float]
    fuel_cost: float
    toll_cost: float
    other_cost: float
    driver_notes: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    status: str
    remarks: Optional[str]
    payment_status: str
    verified_at: Optional[datetime]


# ---------------- Servicing ----------------
class ServicingIn(BaseModel):
    vehicle_id: int
    service_date: date
    service_type: str = Field(min_length=2, max_length=40)
    description: Optional[str] = Field(default=None, max_length=300)
    vendor: Optional[str] = Field(default=None, max_length=100)
    cost: float = Field(ge=0, le=5_000_000)
    odometer_km: Optional[float] = Field(default=None, ge=0, le=5_000_000)
    next_due_date: Optional[date] = None

    @model_validator(mode="after")
    def rules(self):
        if self.service_date > date.today():
            raise ValueError("Service date cannot be in the future")
        if self.next_due_date and self.next_due_date <= self.service_date:
            raise ValueError("Next due date must be after service date")
        return self


class ServicingOut(ORM):
    id: int
    vehicle_id: int
    service_date: date
    service_type: str
    description: Optional[str]
    vendor: Optional[str]
    cost: float
    odometer_km: Optional[float]
    next_due_date: Optional[date]
    vehicle_no: Optional[str] = None


# ---------------- Advances ----------------
class AdvanceIn(BaseModel):
    driver_id: int
    given_on: date
    amount: float = Field(gt=0, le=500_000)
    note: Optional[str] = Field(default=None, max_length=200)


class AdvanceOut(ORM, AdvanceIn):
    id: int
    payroll_id: Optional[int]
    driver_name: Optional[str] = None


# ---------------- Payroll ----------------
class PayrollGenerate(BaseModel):
    month: str

    @field_validator("month")
    @classmethod
    def v_month(cls, v):
        if not MONTH_RE.match(v):
            raise ValueError("Month must be YYYY-MM")
        return v


class PayrollAdjust(BaseModel):
    bonus: float = Field(default=0, ge=0, le=1_000_000)
    other_deduction: float = Field(default=0, ge=0, le=1_000_000)


class PayrollOut(ORM):
    id: int
    driver_id: int
    driver_name: Optional[str] = None
    month: str
    trip_count: int
    days_worked: int
    total_km: float
    trip_pay: float
    reimbursement: float
    bonus: float
    advance_deduction: float
    other_deduction: float
    net_pay: float
    status: str
    paid_at: Optional[datetime]


# ---------------- Push ----------------
class PushKeys(BaseModel):
    p256dh: str = Field(min_length=10, max_length=200)
    auth: str = Field(min_length=4, max_length=100)


class PushSubIn(BaseModel):
    endpoint: str = Field(min_length=10, max_length=1000)
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def https_only(cls, v):
        if not v.startswith("https://"):
            raise ValueError("Invalid push endpoint")
        return v


class PushEndpoint(BaseModel):
    endpoint: str = Field(max_length=1000)
