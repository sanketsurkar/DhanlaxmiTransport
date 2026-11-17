from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notification, User, Role
from app.services.push import send_push


def notify(db: Session, message: str, user_id: Optional[int] = None, link: str = None,
           important: bool = False, title: Optional[str] = None):
    """user_id=None -> all active Owner/Admin.  important=True -> pop-up + phone push."""
    n = Notification(user_id=user_id, message=message[:300], link=link,
                     important=important, title=title[:80] if title else None)
    db.add(n)
    if important:
        db.flush()
        if user_id:
            targets = [user_id]
        else:
            targets = [r[0] for r in db.query(User.id).filter(User.role.in_(Role.STAFF),
                                                              User.is_active.is_(True)).all()]
        send_push(db, targets, title or "TransportPro", message, link, tag=f"tp-{n.id}")
    return n
