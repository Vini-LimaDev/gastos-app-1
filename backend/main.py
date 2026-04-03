from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import auth
import transactions
import budgets
import goals
import cards
from categories import router as categories_router


load_dotenv()

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

app.include_router(auth.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(categories_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Controle de Gastos API", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}