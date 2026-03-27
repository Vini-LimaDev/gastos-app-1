from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from auth import router as auth_router
from transactions import router as transactions_router

app = FastAPI(
    title="Controle de Gastos API",
    description="API para gerenciamento de gastos pessoais",
    version="1.0.0",
)

# CORS
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(transactions_router)


@app.get("/")
async def root():
    return {"message": "Controle de Gastos API 🚀", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
