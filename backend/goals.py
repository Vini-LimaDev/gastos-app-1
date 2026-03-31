from fastapi import APIRouter, HTTPException, Depends
from typing import List
from auth import get_current_user
from database import supabase
from models import GoalCreate, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/", response_model=List[dict])
async def list_goals(current_user: dict = Depends(get_current_user)):
    try:
        result = supabase.table("goals")\
            .select("*")\
            .eq("user_id", current_user["id"])\
            .order("created_at", desc=True)\
            .execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = {
            "user_id": current_user["id"],
            "name": data.name,
            "target_amount": data.target_amount,
            "current_amount": data.current_amount,
            "deadline": str(data.deadline) if data.deadline else None,
            "emoji": data.emoji,
            "notes": data.notes,
        }
        result = supabase.table("goals").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar meta")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{goal_id}", response_model=dict)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("goals")\
        .select("id")\
        .eq("id", goal_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "deadline" in update_data and update_data["deadline"]:
        update_data["deadline"] = str(update_data["deadline"])

    # Allow setting current_amount to 0
    raw = data.model_dump()
    if raw.get("current_amount") is not None:
        update_data["current_amount"] = raw["current_amount"]

    result = supabase.table("goals").update(update_data).eq("id", goal_id).execute()
    return result.data[0]


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("goals")\
        .select("id")\
        .eq("id", goal_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    supabase.table("goals").delete().eq("id", goal_id).execute()
    return None
