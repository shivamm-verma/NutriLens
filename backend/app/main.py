"""NutriLens API."""
import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app import model as nl_model
from app.model import NutriLensError, analyze_food_image, api_key_configured

logging.basicConfig(level=logging.INFO)

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB

app = FastAPI(title="NutriLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=False,  # required when using the "*" wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": nl_model._active_model or nl_model.MODEL_NAME, "api_key_configured": api_key_configured()}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), hint: str = Form("")):
    if (file.content_type or "").lower() not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload a JPG, PNG, WEBP or GIF image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(image_bytes) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 10 MB.")

    try:
        return await run_in_threadpool(analyze_food_image, image_bytes, hint)
    except NutriLensError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception:
        logging.exception("Unhandled error in /api/analyze")
        raise HTTPException(status_code=500, detail="Something went wrong while analysing the image.")
