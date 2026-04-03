from fastapi import APIRouter, HTTPException, Depends
from typing import List
from auth import get_current_user
from database import supabase_admin as supabase
from models import CardCreate, CardUpdate

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("/", response_model=List[dict])
async def list_cards(current_user: dict = Depends(get_current_user)):
    try:
        result = supabase.table("cards") \
            .select("*") \
            .eq("user_id", current_user["id"]) \
            .order("created_at") \
            .execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_card(data: CardCreate, current_user: dict = Depends(get_current_user)):
    try:
        payload = {
            "user_id": current_user["id"],
            "name": data.name,
            "bank": data.bank,
            "last_four": data.last_four,
            "color": data.color,
            "card_type": data.card_type,
        }
        result = supabase.table("cards").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar cartão")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{card_id}", response_model=dict)
async def update_card(
    card_id: str,
    data: CardUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("cards") \
        .select("id") \
        .eq("id", card_id) \
        .eq("user_id", current_user["id"]) \
        .single() \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = supabase.table("cards") \
        .update(update_data) \
        .eq("id", card_id) \
        .execute()
    return result.data[0]


@router.delete("/{card_id}", status_code=204)
async def delete_card(card_id: str, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("cards") \
        .select("id") \
        .eq("id", card_id) \
        .eq("user_id", current_user["id"]) \
        .single() \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")

    supabase.table("cards").delete().eq("id", card_id).execute()
    return None