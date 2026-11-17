from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import DATABASE_URL

url = DATABASE_URL
# Neon/Render give "postgres://" or "postgresql://" -> tell SQLAlchemy to use psycopg 3
if url.startswith("postgres://"):
    url = "postgresql+psycopg://" + url[len("postgres://"):]
elif url.startswith("postgresql://"):
    url = "postgresql+psycopg://" + url[len("postgresql://"):]

if url.startswith("sqlite"):
    engine = create_engine(url, connect_args={"check_same_thread": False})
else:
    # pre_ping/recycle: reconnect cleanly after Neon/Render sleep
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
