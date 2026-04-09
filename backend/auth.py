from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import os
from database import supabase, supabase_admin
from models import UserRegister, UserLogin, Token
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"id": user.user.id, "email": user.user.email, "token": token}
    except Exception:
        raise HTTPException(status_code=401, detail="Não autorizado")


@router.post("/register")
async def register(data: UserRegister):
    try:
        result = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {"name": data.name},
                "email_redirect_to": f"{FRONTEND_URL}/auth/confirm",
            }
        })
        if not result.user:
            raise HTTPException(status_code=400, detail="Erro ao criar conta")

        if result.session:
            try:
                supabase_admin.table("profiles").insert({
                    "id": result.user.id,
                    "email": data.email,
                    "name": data.name,
                }).execute()
            except Exception:
                pass
            return {
                "confirmed": True,
                "access_token": result.session.access_token,
                "token_type": "bearer",
                "user": {"id": result.user.id, "email": data.email, "name": data.name},
            }

        return {
            "confirmed": False,
            "message": "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
            "email": data.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg or "already been registered" in error_msg:
            raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")
        raise HTTPException(status_code=400, detail=error_msg)


@router.get("/confirm", response_model=Token)
async def confirm_email(token_hash: str = Query(...), type: str = Query(...)):
    try:
        result = supabase.auth.verify_otp({
            "token_hash": token_hash,
            "type": type,
        })

        if not result.user or not result.session:
            raise HTTPException(status_code=400, detail="Link de confirmação inválido ou expirado")

        user_id = result.user.id
        email = result.user.email
        name = result.user.user_metadata.get("name", email)

        print(f"[CONFIRM] user_id={user_id} email={email}")  # 👈

        try:
            existing = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
            print(f"[CONFIRM] existing={existing.data}")  # 👈
            if not existing.data:
                insert_result = supabase_admin.table("profiles").insert({
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "plan": "trial",
                    "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                }).execute()
                print(f"[CONFIRM] insert={insert_result.data}")  # 👈
            else:
                # Profile já existe — atualiza trial_ends_at se estiver nulo
                profile = existing.data[0]
                print(f"[CONFIRM] profile já existe, atualizando trial...")  # 👈
                supabase_admin.table("profiles").update({
                    "plan": "trial",
                    "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                }).eq("id", user_id).execute()
        except Exception as e:
            print(f"[CONFIRM] ERRO no profile: {e}")  # 👈

        return {
            "access_token": result.session.access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": email, "name": name},
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONFIRM] EXCEPTION: {e}")  # 👈
        raise HTTPException(status_code=400, detail="Link de confirmação inválido ou expirado")

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
        profile = supabase_admin.table("profiles").select("*").eq("id", user_id).maybe_single().execute()

        profile_data = profile.data if profile else None
        name = profile_data.get("name", "") if profile_data else result.user.email

        return {
            "access_token": result.session.access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": result.user.email, "name": name},
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO LOGIN: {type(e).__name__}: {e}")
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
    profile = supabase_admin.table("profiles").select("*").eq("id", current_user["id"]).maybe_single().execute()
    if profile.data:
        return profile.data
    return current_user


# ── Atualizar perfil ──────────────────────────────────
class ProfileUpdate(BaseModel):
    name: str


@router.put("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="O nome não pode ser vazio")
    if len(name) > 100:
        raise HTTPException(status_code=400, detail="Nome muito longo (máx. 100 caracteres)")

    result = supabase_admin.table("profiles") \
        .update({"name": name}) \
        .eq("id", current_user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    return {"id": current_user["id"], "email": current_user["email"], "name": name}


# ── Confirmar token via hash da URL ──────────────────
class TokenConfirm(BaseModel):
    access_token: str
    refresh_token: str = ""


@router.post("/confirm-token", response_model=Token)
async def confirm_token(data: TokenConfirm):
    try:
        user_info = supabase.auth.get_user(data.access_token)
        if not user_info or not user_info.user:
            raise HTTPException(status_code=400, detail="Token inválido")

        user_id = user_info.user.id
        email = user_info.user.email
        name = user_info.user.user_metadata.get("name", email)

        existing = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
        if not existing.data:
            supabase_admin.table("profiles").insert({
                "id": user_id,
                "email": email,
                "name": name,
            }).execute()

        return {
            "access_token": data.access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": email, "name": name},
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Token inválido")


# ── Vincular/remover número de WhatsApp ──────────────
class PhoneUpdate(BaseModel):
    phone: Optional[str] = None


@router.put("/phone")
async def update_phone(data: PhoneUpdate, current_user: dict = Depends(get_current_user)):
    phone = data.phone

    if phone is not None:
        import re
        if not re.match(r"^\+\d{10,15}$", phone):
            raise HTTPException(
                status_code=422,
                detail="Número inválido. Use formato internacional: +5511999999999"
            )

        existing = supabase_admin.table("profiles") \
            .select("id") \
            .eq("phone", phone) \
            .neq("id", current_user["id"]) \
            .execute()

        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Este número já está vinculado a outra conta."
            )

    supabase_admin.table("profiles") \
        .update({"phone": phone}) \
        .eq("id", current_user["id"]) \
        .execute()

    return {"message": "Número atualizado com sucesso", "phone": phone}