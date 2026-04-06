from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel as PydanticBase
from database import supabase, supabase_admin
from models import UserRegister, UserLogin, Token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


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
                "data": {"name": data.name}
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

        try:
            existing = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
            if not existing.data:
                supabase_admin.table("profiles").insert({
                    "id": user_id,
                    "email": email,
                    "name": name,
                }).execute()
        except Exception as e:
            print(f"Erro ao criar profile no confirm: {e}")

        return {
            "access_token": result.session.access_token,
            "token_type": "bearer",
            "user": {"id": user_id, "email": email, "name": name},
        }

    except HTTPException:
        raise
    except Exception:
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
        
        # maybe_single() retorna None quando não acha — acessa .data com segurança
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
        print(f"ERRO LOGINNNN: {type(e).__name__}: {e}")
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


# ── Formato legado: access_token vindo no hash da URL ──
class TokenConfirm(PydanticBase):
    access_token: str
    refresh_token: str = ""


@router.post("/confirm-token", response_model=Token)
async def confirm_token(data: TokenConfirm):
    """Processa o access_token vindo do hash da URL (formato legado do Supabase)."""
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