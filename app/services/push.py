"""Web Push sender. Active only when VAPID keys exist and pywebpush is installed."""
import json, logging, threading
from app.config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_EMAIL

log = logging.getLogger("push")
SENT_LOG = []   # last payloads (used by tests / debugging)


def push_enabled() -> bool:
    if not (VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY):
        return False
    try:
        import pywebpush  # noqa: F401
        return True
    except ImportError:
        return False


def send_push(db, user_ids, title, body, link=None, tag=None):
    if not user_ids or not push_enabled():
        return
    from app.models import PushSubscription
    subs = db.query(PushSubscription).filter(PushSubscription.user_id.in_(list(user_ids))).all()
    targets = [(s.id, {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}) for s in subs]
    if targets:
        payload = json.dumps({"title": title, "body": body, "link": link or "", "tag": tag})
        SENT_LOG.append({"targets": [t[0] for t in targets], "payload": payload})
        del SENT_LOG[:-50]
        # background thread -> API response is not delayed by slow push servers
        threading.Thread(target=_deliver, args=(targets, payload), daemon=True).start()


def _deliver(targets, payload):
    from pywebpush import webpush, WebPushException
    from app.database import SessionLocal
    from app.models import PushSubscription
    dead = []
    for sid, info in targets:
        try:
            webpush(info, payload, vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": VAPID_EMAIL}, ttl=6 * 3600, timeout=10)
        except WebPushException as e:
            if getattr(e.response, "status_code", None) in (404, 410):
                dead.append(sid)          # app uninstalled / notifications blocked
            else:
                log.warning("push failed: %s", e)
        except Exception as e:  # noqa: BLE001
            log.warning("push error: %s", e)
    if dead:
        with SessionLocal() as db:
            db.query(PushSubscription).filter(PushSubscription.id.in_(dead)).delete(synchronize_session=False)
            db.commit()
