from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from database import supabase
from models import UserRegister, UserLogin, Token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifica o token JWT do Supabase e retorna o usuário."""
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        return {"id": user.user.id, "email": user.user.email, "token": token}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


@router.post("/register", response_model=Token)
async def register(data: UserRegister):
    try:
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {"name": data.name}
            }
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Erro ao criar conta")

        # Inserir perfil na tabela profiles
        supabase.table("profiles").insert({
            "id": response.user.id,
            "email": data.email,
            "name": data.name,
        }).execute()

        token = response.session.access_token if response.session else ""

        return Token(
            access_token=token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "name": data.name,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
async def login(data: UserLogin):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")

        # Buscar perfil
        profile = supabase.table("profiles").select("name").eq("id", response.user.id).single().execute()
        name = profile.data.get("name", "") if profile.data else ""

        return Token(
            access_token=response.session.access_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "name": name,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    try:
        supabase.auth.sign_out()
        return {"message": "Logout realizado com sucesso"}
    except:
        return {"message": "Logout realizado"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    profile = supabase.table("profiles").select("*").eq("id", current_user["id"]).single().execute()
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": profile.data.get("name", "") if profile.data else "",
    }
