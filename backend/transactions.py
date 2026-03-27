from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import date
from auth import get_current_user
from database import supabase
from models import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


def build_query(user_id: str, start_date=None, end_date=None,
                category=None, type=None, min_amount=None, max_amount=None):
    query = supabase.table("transactions").select("*").eq("user_id", user_id)

    if start_date:
        query = query.gte("date", str(start_date))
    if end_date:
        query = query.lte("date", str(end_date))
    if category:
        query = query.eq("category", category)
    if type:
        query = query.eq("type", type)
    if min_amount is not None:
        query = query.gte("amount", min_amount)
    if max_amount is not None:
        query = query.lte("amount", max_amount)

    return query


@router.get("/", response_model=List[dict])
async def list_transactions(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        query = build_query(
            current_user["id"], start_date, end_date,
            category, type, min_amount, max_amount
        )
        result = query.order("date", desc=True).execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = {
            "user_id": current_user["id"],
            "description": data.description,
            "amount": data.amount,
            "type": data.type,
            "category": data.category,
            "date": str(data.date),
            "notes": data.notes,
        }
        result = supabase.table("transactions").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar transação")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{transaction_id}", response_model=dict)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = supabase.table("transactions")\
        .select("*")\
        .eq("id", transaction_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return result.data


@router.put("/{transaction_id}", response_model=dict)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Verificar se pertence ao usuário
    existing = supabase.table("transactions")\
        .select("id")\
        .eq("id", transaction_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "date" in update_data:
        update_data["date"] = str(update_data["date"])

    result = supabase.table("transactions")\
        .update(update_data)\
        .eq("id", transaction_id)\
        .execute()

    return result.data[0]


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("transactions")\
        .select("id")\
        .eq("id", transaction_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    supabase.table("transactions").delete().eq("id", transaction_id).execute()
    return None


@router.get("/summary/monthly", response_model=dict)
async def get_monthly_summary(
    year: int = Query(...),
    month: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Resumo do mês: total de receitas, despesas e saldo."""
    from datetime import date
    import calendar

    start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)

    result = supabase.table("transactions")\
        .select("*")\
        .eq("user_id", current_user["id"])\
        .gte("date", str(start))\
        .lte("date", str(end))\
        .execute()

    transactions = result.data or []

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")

    by_category = {}
    for t in transactions:
        if t["type"] == "expense":
            cat = t["category"]
            by_category[cat] = by_category.get(cat, 0) + t["amount"]

    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "by_category": by_category,
        "transaction_count": len(transactions),
    }


@router.get("/summary/yearly", response_model=dict)
async def get_yearly_summary(
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Resumo do ano: receitas e despesas por mês."""
    start = f"{year}-01-01"
    end = f"{year}-12-31"

    result = supabase.table("transactions")\
        .select("*")\
        .eq("user_id", current_user["id"])\
        .gte("date", start)\
        .lte("date", end)\
        .execute()

    transactions = result.data or []

    monthly = {}
    for i in range(1, 13):
        monthly[i] = {"income": 0, "expense": 0}

    for t in transactions:
        m = int(t["date"].split("-")[1])
        if t["type"] == "income":
            monthly[m]["income"] += t["amount"]
        else:
            monthly[m]["expense"] += t["amount"]

    return {
        "year": year,
        "monthly": [
            {"month": m, "income": v["income"], "expense": v["expense"]}
            for m, v in monthly.items()
        ]
    }
