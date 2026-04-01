from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from auth import get_current_user
from database import supabase_admin as supabase
from models import BudgetCreate, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/", response_model=List[dict])
async def list_budgets(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        query = supabase.table("budgets").select("*").eq("user_id", current_user["id"])
        if month:
            query = query.eq("month", month)
        if year:
            query = query.eq("year", year)
        result = query.order("category").execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_budget(
    data: BudgetCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Check for duplicate (same category + month + year)
        existing = supabase.table("budgets")\
            .select("id")\
            .eq("user_id", current_user["id"])\
            .eq("category", data.category)\
            .eq("month", data.month)\
            .eq("year", data.year)\
            .execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe um orçamento para '{data.category}' neste mês"
            )

        payload = {
            "user_id": current_user["id"],
            "category": data.category,
            "limit_amount": data.limit_amount,
            "month": data.month,
            "year": data.year,
        }
        result = supabase.table("budgets").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar orçamento")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{budget_id}", response_model=dict)
async def update_budget(
    budget_id: str,
    data: BudgetUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("budgets")\
        .select("id")\
        .eq("id", budget_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = supabase.table("budgets").update(update_data).eq("id", budget_id).execute()
    return result.data[0]


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("budgets")\
        .select("id")\
        .eq("id", budget_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")

    supabase.table("budgets").delete().eq("id", budget_id).execute()
    return None