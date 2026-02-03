from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, materials, export

app = FastAPI(title="IFC Materials Summary Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(materials.router, prefix="/api", tags=["materials"])
app.include_router(export.router, prefix="/api", tags=["export"])

@app.get("/")
async def root():
    return {"message": "IFC Materials Summary Viewer"}

@app.get("/health")
async def health_check():
    return {"status":"healthy"}