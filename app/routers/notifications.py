from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.config import VAPID_PUBLIC_KEY
from app.database import get_db
from app.models import Notification, PushSubscription, User, Role
from app.schemas import PushSubIn, PushEndpoint
from app.security import get_current_user
from app.services.notify import notify
from app.services.push import push_enabled

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
push_router = APIRouter(prefix="/api/push", tags=["Push"])


def _mine(db: Session, user: User):
    q = db.query(Notification)
    if user.role in Role.STAFF:
        return q.filter(or_(Notification.user_id.is_(None), Notification.user_id == user.id))
    return q.filter(Notification.user_id == user.id)


def _item(n: Notification):
    return {"id": n.id, "title": n.title, "message": n.message, "link": n.link,
            "important": bool(n.important), "is_read": n.is_read, "created_at": n.created_at}


def _unread(db, user):
    return _mine(db, user).filter(Notification.is_read.is_(False)).count()


@router.get("")
def list_notifications(only_important: bool = False, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    q = _mine(db, user)
    if only_important:
        q = q.filter(Notification.important.is_(True))
    items = q.order_by(Notification.id.desc()).limit(100).all()
    return {"unread": _unread(db, user), "items": [_item(n) for n in items]}


@router.get("/poll")
def poll(after: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """App calls this every 15 s. First call (no 'after') returns only last_id -> no flood of old alerts."""
    q = _mine(db, user)
    last = q.order_by(Notification.id.desc()).first()
    items = [] if after is None else q.filter(Notification.id > after).order_by(Notification.id).limit(20).all()
    return {"last_id": max(last.id if last else 0, after or 0), "unread": _unread(db, user),
            "items": [_item(n) for n in items]}


@router.post("/read-all")
def read_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _mine(db, user).filter(Notification.is_read.is_(False)).update(
        {Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/{nid}/read")
def read_one(nid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = _mine(db, user).filter(Notification.id == nid).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


# ---------------- phone push subscription ----------------
@push_router.get("/key")
def push_key(user: User = Depends(get_current_user)):
    return {"enabled": push_enabled(), "key": VAPID_PUBLIC_KEY if push_enabled() else ""}


@push_router.post("/subscribe")
def subscribe(data: PushSubIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not push_enabled():
        raise HTTPException(400, "Phone push is not configured on the server")
    s = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if not s:
        s = PushSubscription(endpoint=data.endpoint)
        db.add(s)
    s.user_id, s.p256dh, s.auth = user.id, data.keys.p256dh, data.keys.auth   # phone now belongs to this login
    db.commit()
    return {"ok": True}


@push_router.post("/unsubscribe")
def unsubscribe(data: PushEndpoint, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint,
                                      PushSubscription.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@push_router.get("/status")
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"enabled": push_enabled(),
            "devices": db.query(PushSubscription).filter(PushSubscription.user_id == user.id).count()}


@push_router.post("/test")
def test_alert(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notify(db, "Test alert – notifications are working!", user_id=user.id,
           link="#/notifications", important=True, title="TransportPro")
    db.commit()
    return {"ok": True}
