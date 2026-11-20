import json
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from app.config import APP_VERSION
from app.database import Base, engine, SessionLocal
from app.routers import auth, users, masters, trips, payroll, dashboard, notifications
from app.routers.notifications import push_router
from app.seed import seed



STATIC = Path(__file__).parent / "static"


def upgrade_db():
    """Adds new columns to an existing v3 database (keeps all data)."""
    cols = {c["name"] for c in inspect(engine).get_columns("notifications")}
    with engine.begin() as con:
        if "title" not in cols:
            con.execute(text("ALTER TABLE notifications ADD COLUMN title VARCHAR(80)"))
        if "important" not in cols:
            #con.execute(text("ALTER TABLE notifications ADD COLUMN important BOOLEAN DEFAULT 0"))
            con.execute(text("ALTER TABLE notifications ADD COLUMN important BOOLEAN DEFAULT FALSE"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    upgrade_db()
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="TransportPro", version=APP_VERSION, lifespan=lifespan,
              description="Transport service management – trips, drivers, vehicles, payroll, notifications")


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Return one readable message instead of pydantic's raw error list."""
    msgs = []
    for e in exc.errors():
        field = str(e["loc"][-1]).replace("_", " ") if e.get("loc") else ""
        msg = e["msg"].replace("Value error, ", "")
        custom = e["type"] == "value_error" or field in ("body", "")
        msgs.append(msg if custom else f"{field}: {msg}")
    return JSONResponse(status_code=422, content={"detail": "; ".join(msgs)})


for r in (auth, users, masters, trips, payroll, dashboard, notifications):
    app.include_router(r.router)
app.include_router(push_router)

app.mount("/static", StaticFiles(directory=STATIC), name="static")
NO_CACHE = {"Cache-Control": "no-cache"}

@app.get("/.well-known/assetlinks.json", include_in_schema=False)
def assetlinks():
    """Digital Asset Links: removes the browser bar in the Android app."""
    f = STATIC / "assetlinks.json"
    data = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
    return JSONResponse(data)
    
@app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
def health():
    """Keep-alive check: wakes Render and runs a tiny query so Supabase stays active too."""
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}
    
@app.get("/sw.js", include_in_schema=False)
def service_worker():
    js = (STATIC / "sw.js").read_text(encoding="utf-8").replace("{{V}}", APP_VERSION)
    return HTMLResponse(js, media_type="application/javascript", headers={**NO_CACHE, "Service-Worker-Allowed": "/"})


@app.get("/", include_in_schema=False)
def index():
    html = (STATIC / "index.html").read_text(encoding="utf-8").replace("{{V}}", APP_VERSION)
    return HTMLResponse(html, headers=NO_CACHE)
