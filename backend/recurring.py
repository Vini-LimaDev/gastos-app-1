from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
from typing import Literal
from auth import get_current_user
from database import supabase_admin as supabase

router = APIRouter(prefix="/recurring-templates", tags=["recurring-templates"])

RecurrenceInterval = Literal["monthly", "weekly", "yearly"]


class TemplateCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    type: Literal["expense", "income"]
    category: str
    notes: Optional[str] = None
    recurrence_interval: RecurrenceInterval
    day_of_month: Optional[int] = Field(None, ge=1, le=31)


class TemplateUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[Literal["expense", "income"]] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    recurrence_interval: Optional[RecurrenceInterval] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)


@router.get("/", response_model=List[dict])
async def list_templates(current_user: dict = Depends(get_current_user)):
    try:
        result = supabase.table("recurring_templates")\
            .select("*")\
            .eq("user_id", current_user["id"])\
            .order("created_at", desc=True)\
            .execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_template(data: TemplateCreate, current_user: dict = Depends(get_current_user)):
    try:
        payload = {
            "user_id": current_user["id"],
            "description": data.description,
            "amount": data.amount,
            "type": data.type,
            "category": data.category,
            "notes": data.notes,
            "recurrence_interval": data.recurrence_interval,
            "day_of_month": data.day_of_month,
        }
        result = supabase.table("recurring_templates").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar template")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}", response_model=dict)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("recurring_templates")\
        .select("id")\
        .eq("id", template_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = supabase.table("recurring_templates")\
        .update(update_data)\
        .eq("id", template_id)\
        .execute()
    return result.data[0]


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("recurring_templates")\
        .select("id")\
        .eq("id", template_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    supabase.table("recurring_templates").delete().eq("id", template_id).execute()
    return None