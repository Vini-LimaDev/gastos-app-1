from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date as date_, datetime


# ── Auth ──────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Transactions ──────────────────────────────────────
# Aceita qualquer string — validação de existência fica no router se necessário
CategoryType = str

TransactionType = Literal["expense", "income"]
RecurrenceInterval = Literal["monthly", "weekly", "yearly"]


class TransactionCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    type: TransactionType
    category: CategoryType
    date: date_
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_interval: Optional[RecurrenceInterval] = None
    installment_total: Optional[int] = Field(None, ge=2, le=360)
    card_id: Optional[str] = None


class TransactionUpdate(BaseModel):
    model_config = {"extra": "ignore"}

    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[CategoryType] = None
    date: Optional[date_] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_interval: Optional[RecurrenceInterval] = None
    card_id: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    type: str
    category: str
    date: str
    notes: Optional[str]
    is_recurring: bool
    recurrence_interval: Optional[str]
    card_id: Optional[str]
    created_at: str


# ── Cards ─────────────────────────────────────────────
CardTypeEnum = Literal["credit", "debit"]


class CardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    bank: str = Field(min_length=1, max_length=100)
    last_four: str = Field(min_length=4, max_length=4, pattern=r'^\d{4}$')
    color: str = Field(default="#6366f1")
    card_type: CardTypeEnum = "credit"


class CardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    bank: Optional[str] = Field(None, min_length=1, max_length=100)
    last_four: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r'^\d{4}$')
    color: Optional[str] = None
    card_type: Optional[CardTypeEnum] = None


class CardResponse(BaseModel):
    id: str
    user_id: str
    name: str
    bank: str
    last_four: str
    color: str
    card_type: str
    created_at: str


# ── Budgets ───────────────────────────────────────────
class BudgetCreate(BaseModel):
    category: CategoryType
    limit_amount: float = Field(gt=0)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = Field(None, gt=0)


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    limit_amount: float
    month: int
    year: int
    created_at: str


# ── Goals ─────────────────────────────────────────────
class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0, default=0)
    deadline: Optional[date_] = None
    emoji: Optional[str] = "🎯"
    notes: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[date_] = None
    emoji: Optional[str] = None
    notes: Optional[str] = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    name: str
    target_amount: float
    current_amount: float
    deadline: Optional[str]
    emoji: Optional[str]
    notes: Optional[str]
    created_at: str


# ── Filters ───────────────────────────────────────────
class TransactionFilters(BaseModel):
    start_date: Optional[date_] = None
    end_date: Optional[date_] = None
    category: Optional[str] = None
    type: Optional[TransactionType] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    is_recurring: Optional[bool] = None