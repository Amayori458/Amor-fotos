from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("photo_kiosk")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_filename(name: str) -> str:
    return Path(name).name


async def _ensure_global_settings() -> dict:
    existing = await db.settings.find_one({"key": "global"}, {"_id": 0})
    if existing:
        # ensure admin pin exists for older docs
        if "admin_pin" not in existing:
            await db.settings.update_one(
                {"key": "global"},
                {"$set": {"admin_pin": "1234", "updated_at": _now_iso()}},
                upsert=True,
            )
            existing["admin_pin"] = "1234"
        return existing

    default = {
        "key": "global",
        "store_name": "Amor por Fotos",
        "currency": "BRL",
        "price_per_photo": 2.50,
        "receipt_footer": "Leve este comprovante ao caixa para pagamento.",
        "admin_pin": "1234",
        "updated_at": _now_iso(),
    }
    await db.settings.insert_one(default)
    return {k: v for k, v in default.items() if k != "_id"}


class SettingsOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    store_name: str
    currency: str
    price_per_photo: float
    receipt_footer: str
    updated_at: str


class SettingsUpdateIn(BaseModel):
    store_name: Optional[str] = None
    currency: Optional[str] = None
    price_per_photo: Optional[float] = None
    receipt_footer: Optional[str] = None
    admin_pin: Optional[str] = None


class AdminVerifyIn(BaseModel):
    pin: str = Field(min_length=1)


class SessionCreateOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    upload_path: str
    expires_at: str
    created_at: str


class PhotoOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    photo_id: str
    session_id: str
    file_key: str
    file_name: str
    mime_type: str
    size_bytes: int
    url_path: str
    created_at: str


class SessionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    status: str
    created_at: str
    expires_at: str
    photos_count: int
    last_uploaded_at: Optional[str] = None


class SessionWithPhotosOut(SessionOut):
    photos: List[PhotoOut] = Field(default_factory=list)


class OrderCreateIn(BaseModel):
    selected_photo_ids: Optional[List[str]] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    order_number: str
    session_id: str
    photo_count: int
    currency: str
    price_per_photo: float
    total_amount: float
    store_name: str
    receipt_footer: str
    status: str
    created_at: str
    printed_at: Optional[str] = None
    photos: List[PhotoOut] = Field(default_factory=list)


@api_router.get("/")
async def root():
    return {"message": "Photo Kiosk API"}


@api_router.get("/settings", response_model=SettingsOut)
async def get_settings():
    settings = await _ensure_global_settings()
    # do not expose admin_pin
    safe = {k: v for k, v in settings.items() if k != "admin_pin"}
    return SettingsOut(**safe)


@api_router.put("/settings", response_model=SettingsOut)
async def update_settings(payload: SettingsUpdateIn):
    current = await _ensure_global_settings()
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        safe = {k: v for k, v in current.items() if k != "admin_pin"}
        return SettingsOut(**safe)

    update["updated_at"] = _now_iso()

    await db.settings.update_one({"key": "global"}, {"$set": update}, upsert=True)
    merged = {**current, **update}
    merged.pop("_id", None)
    safe = {k: v for k, v in merged.items() if k != "admin_pin"}
    return SettingsOut(**safe)


@api_router.post("/admin/verify-pin")
async def admin_verify_pin(payload: AdminVerifyIn):
    settings = await _ensure_global_settings()
    ok = payload.pin == settings.get("admin_pin", "1234")
    return {"ok": ok}


@api_router.post("/sessions", response_model=SessionCreateOut)
async def create_session():
    session_id = uuid.uuid4().hex
    created_at = _now_iso()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    doc = {
        "session_id": session_id,
        "status": "active",
        "created_at": created_at,
        "expires_at": expires_at,
    }
    await db.sessions.insert_one(doc)
    return SessionCreateOut(
        session_id=session_id,
        upload_path=f"/upload/{session_id}",
        created_at=created_at,
        expires_at=expires_at,
    )


async def _get_session_doc(session_id: str) -> dict:
    doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    try:
        if datetime.fromisoformat(doc["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Sessão expirada")
    except ValueError:
        pass
    return doc


@api_router.get("/sessions/{session_id}", response_model=SessionWithPhotosOut)
async def get_session(session_id: str):
    session = await _get_session_doc(session_id)
    photos = await db.photos.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    photos_out = [PhotoOut(**p) for p in photos]

    last_uploaded_at = photos_out[-1].created_at if photos_out else None

    return SessionWithPhotosOut(
        session_id=session["session_id"],
        status=session.get("status", "active"),
        created_at=session["created_at"],
        expires_at=session["expires_at"],
        photos_count=len(photos_out),
        last_uploaded_at=last_uploaded_at,
        photos=photos_out,
    )


@api_router.get("/sessions/{session_id}/photos", response_model=List[PhotoOut])
async def list_session_photos(session_id: str):
    _ = await _get_session_doc(session_id)
    photos = await db.photos.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    return [PhotoOut(**p) for p in photos]


@api_router.post("/sessions/{session_id}/photos", response_model=List[PhotoOut])
async def upload_photos(session_id: str, files: List[UploadFile] = File(...)):
    _ = await _get_session_doc(session_id)
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    created: List[PhotoOut] = []

    for f in files:
        original_name = _safe_filename(f.filename or "arquivo")
        content_type = f.content_type or "application/octet-stream"

        suffix = Path(original_name).suffix.lower()
        if not suffix:
            import mimetypes

            guessed = mimetypes.guess_extension(content_type) or ""
            suffix = guessed if guessed else ""

        file_key = f"{uuid.uuid4().hex}{suffix}"
        target = UPLOAD_DIR / file_key

        size = 0
        with target.open("wb") as out:
            while True:
                chunk = await f.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                out.write(chunk)

        created_at = _now_iso()
        photo_id = uuid.uuid4().hex

        doc = {
            "photo_id": photo_id,
            "session_id": session_id,
            "file_key": file_key,
            "file_name": original_name,
            "mime_type": content_type,
            "size_bytes": int(size),
            "url_path": f"/api/uploads/{file_key}",
            "created_at": created_at,
        }
        await db.photos.insert_one(doc)
        created.append(PhotoOut(**doc))

    return created


@api_router.get("/uploads/{file_key}")
async def get_upload(file_key: str):
    safe = _safe_filename(file_key)
    path = (UPLOAD_DIR / safe).resolve()
    if not str(path).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Arquivo inválido")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    media_type = None
    try:
        import mimetypes

        media_type = mimetypes.guess_type(str(path))[0]
    except Exception:
        media_type = None

    return FileResponse(path, media_type=media_type)


def _order_number() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"APF-{stamp}-{uuid.uuid4().hex[:6].upper()}"


@api_router.post("/sessions/{session_id}/orders", response_model=OrderOut)
async def create_order(session_id: str, payload: OrderCreateIn):
    _ = await _get_session_doc(session_id)

    settings = await _ensure_global_settings()

    q = {"session_id": session_id}
    if payload.selected_photo_ids:
        q["photo_id"] = {"$in": payload.selected_photo_ids}

    photos = await db.photos.find(q, {"_id": 0}).sort("created_at", 1).to_list(5000)
    if not photos:
        raise HTTPException(status_code=400, detail="Nenhuma foto para imprimir")

    photos_out = [PhotoOut(**p) for p in photos]

    price = float(settings.get("price_per_photo", 2.50))
    total = round(price * len(photos_out), 2)

    order_number = _order_number()
    created_at = _now_iso()

    doc = {
        "order_number": order_number,
        "session_id": session_id,
        "photo_ids": [p.photo_id for p in photos_out],
        "photo_count": len(photos_out),
        "currency": settings.get("currency", "BRL"),
        "price_per_photo": price,
        "total_amount": total,
        "store_name": settings.get("store_name", "Amor por Fotos"),
        "receipt_footer": settings.get("receipt_footer", ""),
        "status": "pending_print",
        "created_at": created_at,
        "printed_at": None,
    }
    await db.orders.insert_one(doc)

    return OrderOut(**{**doc, "photos": photos_out})


@api_router.get("/orders/{order_number}", response_model=OrderOut)
async def get_order(order_number: str):
    doc = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    photos = await db.photos.find({"photo_id": {"$in": doc.get("photo_ids", [])}}, {"_id": 0}).to_list(5000)
    by_id = {p["photo_id"]: p for p in photos}
    ordered = [by_id[pid] for pid in doc.get("photo_ids", []) if pid in by_id]
    photos_out = [PhotoOut(**p) for p in ordered]

    return OrderOut(**{**doc, "photos": photos_out})


@api_router.post("/orders/{order_number}/mark-printed", response_model=OrderOut)
async def mark_order_printed(order_number: str):
    existing = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    printed_at = _now_iso()
    await db.orders.update_one(
        {"order_number": order_number},
        {"$set": {"status": "printed", "printed_at": printed_at}},
    )

    updated = {**existing, "status": "printed", "printed_at": printed_at}

    photos = await db.photos.find({"photo_id": {"$in": updated.get("photo_ids", [])}}, {"_id": 0}).to_list(5000)
    by_id = {p["photo_id"]: p for p in photos}
    ordered = [by_id[pid] for pid in updated.get("photo_ids", []) if pid in by_id]
    photos_out = [PhotoOut(**p) for p in ordered]

    return OrderOut(**{**updated, "photos": photos_out})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
