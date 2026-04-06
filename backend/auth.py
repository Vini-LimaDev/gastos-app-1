from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase_admin as supabase
from models import UserRegister, UserLogin, Token
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {
            "id": user.user.id,
            "email": user.user.email,
            "token": token,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Não autorizado")


@router.post("/register", response_model=Token)
async def register(data: UserRegister):
    try:
        result = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })
        if not result.user:
            raise HTTPException(status_code=400, detail="Erro ao criar conta")

        user_id = result.user.id
        # Create profile
        try:
            supabase.table("profiles").insert({
                "id": user_id,
                "email": data.email,
                "name": data.name,
            }).execute()
        except Exception:
            pass  # profile may already exist

        token = result.session.access_token if result.session else ""
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": data.email, "name": data.name},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
async def login(data: UserLogin):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
        if not result.user or not result.session:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        user_id = result.user.id
        # Fetch profile
        profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        name = profile.data.get("name", "") if profile.data else result.user.email

        return {
            "access_token": result.session.access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": result.user.email, "name": name},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    try:
        supabase.auth.sign_out()
    except Exception:
        pass
    return {"message": "Logout realizado"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    profile = supabase.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
    if profile.data:
        return profile.data
    return current_user

class PhoneUpdate(BaseModel):
    phone: Optional[str] = None

@router.put("/phone")
async def update_phone(data: PhoneUpdate, current_user: dict = Depends(get_current_user)):
    """
    Vincula ou remove o número de WhatsApp do perfil do usuário.
    O número é usado pelo webhook para identificar quem mandou a mensagem.
    """
 
    phone = data.phone
 
    # Validação básica se um número foi fornecido
    if phone is not None:
        import re
        if not re.match(r"^\+\d{10,15}$", phone):
            raise HTTPException(
                status_code=422,
                detail="Número inválido. Use formato internacional: +5511999999999"
            )
 
        # Verificar se o número já está vinculado a outra conta
        existing = supabase.table("profiles") \
            .select("id") \
            .eq("phone", phone) \
            .neq("id", current_user["id"]) \
            .execute()
 
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Este número já está vinculado a outra conta."
            )
 
    supabase.table("profiles") \
        .update({"phone": phone}) \
        .eq("id", current_user["id"]) \
        .execute()
 
    return {"message": "Número atualizado com sucesso", "phone": phone}