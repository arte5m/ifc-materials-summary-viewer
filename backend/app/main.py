from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, export, summary
from contextlib import asynccontextmanager
import logging
import signal
import sys
from app.services.file_storage import get_file_storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    storage = get_file_storage()
    storage.cleanup_all()


app = FastAPI(title="IFC Materials Summary Viewer API", lifespan=lifespan)

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(summary.router, prefix="/api", tags=["summary"])


@app.get("/")
async def root():
    return {"message": "IFC Materials Summary Viewer"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
