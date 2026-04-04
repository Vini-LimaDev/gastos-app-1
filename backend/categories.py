from fastapi import APIRouter, HTTPException, Depends
from typing import List
from auth import get_current_user
from database import supabase_admin as supabase
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    {"name": "Alimentação", "color": "#f97316", "icon": "🍽️"},
    {"name": "Transporte",  "color": "#3b82f6", "icon": "🚗"},
    {"name": "Moradia",     "color": "#a855f7", "icon": "🏠"},
    {"name": "Saúde",       "color": "#ef4444", "icon": "❤️"},
    {"name": "Lazer",       "color": "#eab308", "icon": "🎮"},
    {"name": "Educação",    "color": "#6366f1", "icon": "📚"},
    {"name": "Vestuário",   "color": "#ec4899", "icon": "👕"},
    {"name": "Outros",      "color": "#6b7280", "icon": "📦"},
]

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = Field(default="🏷️", max_length=10)

class CategoryUpdate(BaseModel):
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=10)


@router.get("/", response_model=List[dict])
async def list_categories(current_user: dict = Depends(get_current_user)):
    """Retorna categorias padrão + customizadas do usuário."""
    try:
        result = supabase.table("custom_categories") \
            .select("*") \
            .eq("user_id", current_user["id"]) \
            .order("name") \
            .execute()
        custom = result.data or []
        custom_names = {c["name"] for c in custom}
        defaults = [d for d in DEFAULT_CATEGORIES if d["name"] not in custom_names]
        # Marca cada item para o frontend saber se é editável
        for d in defaults:
            d["id"] = None
            d["is_default"] = True
        for c in custom:
            c["is_default"] = False
        return defaults + custom
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict, status_code=201)
async def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    # Bloquear nomes iguais aos defaults
    default_names = {d["name"].lower() for d in DEFAULT_CATEGORIES}
    if data.name.lower() in default_names:
        raise HTTPException(status_code=400, detail="Esse nome já existe nas categorias padrão")

    try:
        result = supabase.table("custom_categories").insert({
            "user_id": current_user["id"],
            "name": data.name,
            "color": data.color,
            "icon": data.icon,
        }).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar categoria")
        return {**result.data[0], "is_default": False}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{category_id}", response_model=dict)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("custom_categories") \
        .select("id") \
        .eq("id", category_id) \
        .eq("user_id", current_user["id"]) \
        .single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    result = supabase.table("custom_categories") \
        .update(update).eq("id", category_id).execute()
    return {**result.data[0], "is_default": False}


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    existing = supabase.table("custom_categories") \
        .select("id") \
        .eq("id", category_id) \
        .eq("user_id", current_user["id"]) \
        .single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    supabase.table("custom_categories").delete().eq("id", category_id).execute()
    return None