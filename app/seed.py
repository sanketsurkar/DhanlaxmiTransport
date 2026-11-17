"""Creates demo accounts and data on first run (only if the DB is empty)."""
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from app.models import User, Vehicle, Customer, Trip, Servicing, Advance, Notification, TripStatus as S
from app.security import hash_password


def seed(db: Session):
    if db.query(User).first():
        return
    today = date.today()
    first = today.replace(day=1)
    owner = User(username="owner", full_name="Business Owner", phone="9876500000", role="OWNER",
                 password_hash=hash_password("owner123"))
    admin = User(username="admin", full_name="Office Admin", phone="9876500001", role="ADMIN",
                 password_hash=hash_password("admin123"))
    d1 = User(username="ramesh", full_name="Ramesh Patil", phone="9876500011", role="DRIVER",
              license_no="MH3120190012345", license_expiry=today + timedelta(days=900),
              address="Hingna, Nagpur", password_hash=hash_password("driver123"))
    d2 = User(username="suresh", full_name="Suresh Yadav", phone="9876500012", role="DRIVER",
              license_no="MH4020180067890", license_expiry=today + timedelta(days=20),
              address="Kamptee, Nagpur", password_hash=hash_password("driver123"))
    db.add_all([owner, admin, d1, d2])

    v1 = Vehicle(reg_no="MH31AB1234", vehicle_type="Truck", model="Tata 1109", capacity="9 Ton",
                 odometer_km=48200, insurance_expiry=today + timedelta(days=200),
                 fitness_expiry=today + timedelta(days=300))
    v2 = Vehicle(reg_no="MH40CD5678", vehicle_type="Tempo", model="Ashok Leyland Dost", capacity="1.5 Ton",
                 odometer_km=22150, insurance_expiry=today + timedelta(days=25),
                 fitness_expiry=today + timedelta(days=400))
    v3 = Vehicle(reg_no="MH31EF4321", vehicle_type="Pickup", model="Mahindra Bolero Pik-Up", capacity="1.7 Ton",
                 odometer_km=61000, insurance_expiry=today + timedelta(days=150))
    db.add_all([v1, v2, v3])

    c1 = Customer(name="Vidarbha Agro Traders", contact_person="Mr. Deshmukh", phone="9822000001",
                  address="Cotton Market, Nagpur")
    c2 = Customer(name="Orange City Logistics", contact_person="Ms. Joshi", phone="9822000002",
                  address="MIDC Butibori")
    db.add_all([c1, c2])
    db.flush()

    def trip(name, d, drv, veh, cust, o, dest, km, amt, pay, status, **kw):
        t = Trip(trip_name=name, trip_date=d, driver_id=drv.id, vehicle_id=veh.id, customer_id=cust.id,
                 origin=o, destination=dest, distance_km=km, trip_amount=amt, driver_pay=pay, status=status, **kw)
        if status in (S.COMPLETED, S.VERIFIED):
            t.started_at = datetime.combine(d, datetime.min.time()).replace(hour=2)
            t.ended_at = t.started_at + timedelta(hours=5)
            t.actual_distance_km = km
        if status == S.VERIFIED:
            t.verified_at, t.verified_by = t.ended_at, admin.id
        db.add(t)

    trip("Nagpur–Amravati cotton load", first, d1, v1, c1, "Nagpur", "Amravati", 155, 9000, 1200, S.VERIFIED,
         fuel_cost=3500, toll_cost=420, payment_status="PAID")
    trip("Butibori–Wardha parcels", first, d2, v2, c2, "Butibori", "Wardha", 60, 3200, 500, S.VERIFIED, fuel_cost=900)
    trip("Nagpur–Chandrapur fertilizer", today, d1, v1, c1, "Nagpur", "Chandrapur", 150, 8500, 1100, S.COMPLETED,
         fuel_cost=3300, toll_cost=380)
    trip("Hingna local pickup", today, d1, v3, c2, "Hingna", "Nagpur", 30, 1800, 350, S.ASSIGNED)
    trip("Kamptee local delivery", today, d2, v2, c2, "Kamptee", "Nagpur", 25, 1500, 300, S.ASSIGNED)
    trip("Nagpur–Bhandara rice bags", today + timedelta(days=1), d1, v1, c1, "Nagpur", "Bhandara", 65, 4000, 600, S.ASSIGNED)

    db.add(Servicing(vehicle_id=v1.id, service_date=first, service_type="General service", vendor="Sai Motors",
                     cost=2500, odometer_km=48000, next_due_date=today + timedelta(days=5)))
    db.add(Advance(driver_id=d1.id, given_on=first, amount=1000, note="Festival advance"))
    db.add(Notification(user_id=d2.id, title="New trip assigned", important=True, link="#/home",
                        message=f"Kamptee local delivery · Kamptee → Nagpur on {today:%d %b}"))
    db.add(Notification(user_id=None, title="Trip to verify", important=True, link="#/trips?status=COMPLETED",
                        message="Ramesh Patil completed Nagpur–Chandrapur fertilizer · 150 km"))
    db.commit()
