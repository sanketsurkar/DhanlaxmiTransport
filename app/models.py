from datetime import datetime, date
from sqlalchemy import (Column, Integer, String, Float, Date, DateTime, Boolean,
                        ForeignKey, UniqueConstraint)
from sqlalchemy.orm import relationship
from app.database import Base


class Role:
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    DRIVER = "DRIVER"
    STAFF = (OWNER, ADMIN)


class TripStatus:
    ASSIGNED = "ASSIGNED"      # created by admin
    STARTED = "STARTED"        # trip running
    COMPLETED = "COMPLETED"    # ended -> waiting for admin verification
    VERIFIED = "VERIFIED"      # approved -> counts in payroll & income
    REJECTED = "REJECTED"      # sent back -> driver corrects & resubmits
    CANCELLED = "CANCELLED"


class User(Base):
    """Owner, Admin and Driver logins. Driver-specific fields are nullable."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False)
    role = Column(String(10), nullable=False, default=Role.DRIVER)
    password_hash = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    license_no = Column(String(30), nullable=True)
    license_expiry = Column(Date, nullable=True)
    address = Column(String(250), nullable=True)
    joined_on = Column(Date, default=date.today)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    reg_no = Column(String(20), unique=True, nullable=False)
    vehicle_type = Column(String(30), nullable=False)
    model = Column(String(60), nullable=True)
    capacity = Column(String(30), nullable=True)
    status = Column(String(15), default="ACTIVE")           # ACTIVE / IN_SERVICE / INACTIVE
    odometer_km = Column(Float, default=0)
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=False)
    email = Column(String(120), nullable=True)
    address = Column(String(250), nullable=True)
    gstin = Column(String(15), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True)
    trip_name = Column(String(150), nullable=False)
    trip_date = Column(Date, nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    distance_km = Column(Float, default=0)          # planned
    trip_amount = Column(Float, default=0)          # billed to customer
    driver_pay = Column(Float, default=0)           # paid to driver for this trip
    start_odometer = Column(Float, nullable=True)   # all optional
    end_odometer = Column(Float, nullable=True)
    actual_distance_km = Column(Float, nullable=True)
    fuel_cost = Column(Float, default=0)
    toll_cost = Column(Float, default=0)
    other_cost = Column(Float, default=0)
    driver_notes = Column(String(300), nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(12), default=TripStatus.ASSIGNED, index=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    remarks = Column(String(300), nullable=True)
    payment_status = Column(String(8), default="UNPAID")   # customer payment
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("User", foreign_keys=[driver_id])
    vehicle = relationship("Vehicle")
    customer = relationship("Customer")


class Servicing(Base):
    __tablename__ = "servicing"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    service_date = Column(Date, nullable=False)
    service_type = Column(String(40), nullable=False)
    description = Column(String(300), nullable=True)
    vendor = Column(String(100), nullable=True)
    cost = Column(Float, default=0)
    odometer_km = Column(Float, nullable=True)
    next_due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    vehicle = relationship("Vehicle")


class Advance(Base):
    """Cash advance given to a driver; recovered in next payroll."""
    __tablename__ = "advances"
    id = Column(Integer, primary_key=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    given_on = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    note = Column(String(200), nullable=True)
    payroll_id = Column(Integer, ForeignKey("payroll.id"), nullable=True)
    driver = relationship("User")


class Payroll(Base):
    __tablename__ = "payroll"
    __table_args__ = (UniqueConstraint("driver_id", "month"),)
    id = Column(Integer, primary_key=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    month = Column(String(7), nullable=False)        # YYYY-MM
    trip_count = Column(Integer, default=0)
    days_worked = Column(Integer, default=0)
    total_km = Column(Float, default=0)
    trip_pay = Column(Float, default=0)
    reimbursement = Column(Float, default=0)
    bonus = Column(Float, default=0)
    advance_deduction = Column(Float, default=0)
    other_deduction = Column(Float, default=0)
    net_pay = Column(Float, default=0)
    status = Column(String(6), default="DRAFT")      # DRAFT / PAID
    paid_at = Column(DateTime, nullable=True)
    driver = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null => all staff
    title = Column(String(80), nullable=True)
    message = Column(String(300), nullable=False)
    link = Column(String(100), nullable=True)
    important = Column(Boolean, default=False)       # True -> pop-up + phone push
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PushSubscription(Base):
    """One row per phone/browser that allowed notifications."""
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    endpoint = Column(String(1000), unique=True, nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
