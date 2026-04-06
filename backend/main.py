from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import auth
import transactions
import budgets
import goals
import cards
import recurring
from categories import router as categories_router
from recurring_job import process_recurring_transactions
from auth import get_current_user

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Controle de Gastos API",
    version="2.0.0",
    description="API para controle de gastos pessoais",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.method in ("PUT", "POST", "PATCH"):
        body = await request.body()
        request._body = body
    return await call_next(request)

# ── Scheduler ──────────────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(
        func=process_recurring_transactions,
        trigger=CronTrigger(hour=0, minute=0),
        id="recurring_transactions",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — job de recorrentes agendado para meia-noite")

@app.on_event("shutdown")
async def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler encerrado")

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(recurring.router, prefix="/api")
app.include_router(categories_router, prefix="/api")

# ── Endpoint manual ────────────────────────────────────────────────────────────

@app.post("/api/recurring/process", tags=["recurring"])
async def trigger_recurring_processing(current_user: dict = Depends(get_current_user)):
    """Força o processamento das transações recorrentes agora."""
    result = process_recurring_transactions()
    return result

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Controle de Gastos API", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}