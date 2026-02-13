#!/usr/bin/env python3
"""
Create test data for receipt testing
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _order_number() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"APF-{stamp}-{uuid.uuid4().hex[:6].upper()}"

async def create_test_data():
    """Create test session, photos, and order for receipt testing"""
    
    # Create test session
    session_id = "test-session-receipt-" + uuid.uuid4().hex[:8]
    created_at = _now_iso()
    
    session_doc = {
        "session_id": session_id,
        "status": "active",
        "created_at": created_at,
        "expires_at": created_at,  # Won't expire during test
    }
    await db.sessions.insert_one(session_doc)
    print(f"✅ Created test session: {session_id}")
    
    # Create test photos
    test_photos = []
    for i in range(3):  # Create 3 test photos
        photo_id = uuid.uuid4().hex
        photo_doc = {
            "photo_id": photo_id,
            "session_id": session_id,
            "file_key": f"test-photo-{i+1}.jpg",
            "file_name": f"test-photo-{i+1}.jpg",
            "mime_type": "image/jpeg",
            "size_bytes": 1024000,  # 1MB
            "url_path": f"/api/uploads/test-photo-{i+1}.jpg",
            "created_at": created_at,
        }
        await db.photos.insert_one(photo_doc)
        test_photos.append(photo_doc)
        print(f"✅ Created test photo: {photo_doc['file_name']}")
    
    # Get settings for order creation
    settings = await db.settings.find_one({"key": "global"}, {"_id": 0})
    if not settings:
        settings = {
            "store_name": "Amor por Fotos",
            "currency": "BRL", 
            "price_per_photo": 2.50,
            "receipt_footer": "Leve este comprovante ao caixa para pagamento.",
        }
    
    # Create test order
    order_number = _order_number()
    price = float(settings.get("price_per_photo", 2.50))
    total = round(price * len(test_photos), 2)
    
    order_doc = {
        "order_number": order_number,
        "session_id": session_id,
        "photo_ids": [p["photo_id"] for p in test_photos],
        "photo_count": len(test_photos),
        "currency": settings.get("currency", "BRL"),
        "price_per_photo": price,
        "total_amount": total,
        "store_name": settings.get("store_name", "Amor por Fotos"),
        "receipt_footer": settings.get("receipt_footer", "Leve este comprovante ao caixa para pagamento."),
        "status": "pending_print",
        "created_at": created_at,
        "printed_at": None,
    }
    await db.orders.insert_one(order_doc)
    print(f"✅ Created test order: {order_number}")
    print(f"   - Photos: {len(test_photos)}")
    print(f"   - Price per photo: {settings.get('currency', 'BRL')} {price}")
    print(f"   - Total: {settings.get('currency', 'BRL')} {total}")
    
    return {
        "session_id": session_id,
        "order_number": order_number,
        "photo_count": len(test_photos),
        "total": total,
        "currency": settings.get("currency", "BRL")
    }

async def main():
    try:
        result = await create_test_data()
        print(f"\n🎉 Test data created successfully!")
        print(f"📝 Test receipt URL: /print/{result['order_number']}")
        print(f"📝 Combined receipt URL: /print/{result['order_number']}?combined=1")
        print(f"📝 Autoprint URL: /print/{result['order_number']}?autoprint=1&combined=1")
        return result
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        return None
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())