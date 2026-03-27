from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date, datetime


# ---------- Auth ----------
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


# ---------- Transactions ----------
CategoryType = Literal[
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Educação",
    "Vestuário",
    "Outros",
]

TransactionType = Literal["expense", "income"]


class TransactionCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    type: TransactionType
    category: CategoryType
    date: date
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[CategoryType] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    type: str
    category: str
    date: str
    notes: Optional[str]
    created_at: str


# ---------- Filters ----------
class TransactionFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    type: Optional[TransactionType] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
