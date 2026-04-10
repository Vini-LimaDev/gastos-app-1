"""
payments.py — Integração Mercado Pago (Preapproval / Assinaturas)

Planos:
  - trial   → 30 dias grátis com acesso a tudo
  - basic   → R$ 9,90/mês — acesso a todas features exceto WhatsApp IA
  - pro     → R$ 19,90/mês — acesso total + WhatsApp IA
  - expired → trial expirado, sem assinatura ativa
"""

import os
import logging
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import supabase_admin
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
MP_API_BASE     = "https://api.mercadopago.com"
FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:5173")

PLANS = {
    "basic": {
        "name": "GastosApp Basic",
        "amount": 9.90,
        "back_url_param": "basic",
    },
    "pro": {
        "name": "GastosApp Pro",
        "amount": 19.90,
        "back_url_param": "pro",
    },
}


# ── Helpers ───────────────────────────────────────────────

def _mp_headers() -> dict:
    return {
        "Authorization": f"Bearer {MP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }


def _get_effective_plan(profile: dict) -> str:
    """Calcula plano efetivo considerando expiração do trial."""
    plan = profile.get("plan", "trial")
    if plan == "trial":
        trial_ends_at = profile.get("trial_ends_at")
        if trial_ends_at:
            if isinstance(trial_ends_at, str):
                trial_ends_at = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > trial_ends_at:
                return "expired"
    return plan


# ── Rotas ─────────────────────────────────────────────────

@router.get("/status")
async def get_status(current_user: dict = Depends(get_current_user)):
    result = (
        supabase_admin
        .table("profiles")
        .select("plan,trial_ends_at,subscription_id,plan_updated_at")
        .eq("id", current_user["id"])
        .limit(1)
        .execute()
    )

    data = result.data[0] if result.data else None

    if not data:
        trial_ends = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        supabase_admin.table("profiles").upsert({
            "id": current_user["id"],
            "email": current_user["email"],
            "name": current_user["email"],
            "plan": "trial",
            "trial_ends_at": trial_ends,
        }).execute()
        return {
            "plan": "trial",
            "trial_ends_at": trial_ends,
            "subscription_id": None,
            "plan_updated_at": None,
        }

    effective_plan = _get_effective_plan(data)

    if effective_plan == "expired" and data.get("plan") == "trial":
        supabase_admin.table("profiles").update({
            "plan": "expired",
            "plan_updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", current_user["id"]).execute()

    return {
        "plan": effective_plan,
        "trial_ends_at": data.get("trial_ends_at"),
        "subscription_id": data.get("subscription_id"),
        "plan_updated_at": data.get("plan_updated_at"),
    }


class SubscriptionRequest(BaseModel):
    plan_type: str  # 'basic' | 'pro'


@router.post("/create-subscription")
async def create_subscription(
    body: SubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria uma assinatura Preapproval no Mercado Pago e retorna o link de checkout."""
    if not MP_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Pagamentos não configurados")

    if body.plan_type not in PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido. Use 'basic' ou 'pro'")

    user_id  = current_user["id"]
    email    = current_user["email"]
    plan_cfg = PLANS[body.plan_type]

    # Verifica se já tem o plano solicitado
    profile = (
        supabase_admin.table("profiles")
        .select("plan")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    current_plan = profile.data.get("plan") if profile.data else None
    if current_plan == body.plan_type:
        raise HTTPException(status_code=400, detail=f"Você já possui o plano {body.plan_type.capitalize()}")

    payload = {
        "reason": plan_cfg["name"],
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": plan_cfg["amount"],
            "currency_id": "BRL",
        },
        "payer_email": os.getenv("MP_TEST_PAYER_EMAIL", email),
        "external_reference": f"{user_id}|{body.plan_type}",  # user_id + plano para o webhook
        "back_url": f"{FRONTEND_URL}/planos?status=success&plan={plan_cfg['back_url_param']}",
        "status": "pending",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MP_API_BASE}/preapproval",
            headers=_mp_headers(),
            json=payload,
            timeout=15,
        )

    if resp.status_code not in (200, 201):
        logger.error("MP create-subscription error: %s", resp.text)
        raise HTTPException(status_code=502, detail="Erro ao criar assinatura no Mercado Pago")

    data = resp.json()
    return {
        "checkout_url": data["init_point"],
        "subscription_id": data["id"],
    }


@router.post("/webhook")
async def webhook(request: Request):
    """Recebe notificações do Mercado Pago sobre mudanças de assinatura."""
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored"}

    topic = body.get("type") or body.get("topic", "")
    if topic != "preapproval":
        return {"status": "ignored"}

    preapproval_id = body.get("data", {}).get("id") or body.get("id")
    if not preapproval_id:
        return {"status": "ignored"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{MP_API_BASE}/preapproval/{preapproval_id}",
            headers=_mp_headers(),
            timeout=15,
        )

    if resp.status_code != 200:
        logger.error("MP webhook fetch error: %s", resp.text)
        return {"status": "error"}

    data      = resp.json()
    status    = data.get("status")          # authorized | paused | cancelled
    ext_ref   = data.get("external_reference", "")
    sub_id    = data.get("id")

    # external_reference = "user_id|plan_type"
    parts   = ext_ref.split("|")
    user_id = parts[0] if parts else None
    plan_type = parts[1] if len(parts) > 1 else "basic"

    if not user_id:
        return {"status": "no_user"}

    if status == "authorized":
        new_plan = plan_type  # 'basic' ou 'pro'
    elif status in ("cancelled", "paused"):
        new_plan = "expired"
    else:
        return {"status": "ignored"}

    supabase_admin.table("profiles").update({
        "plan": new_plan,
        "subscription_id": sub_id,
        "plan_updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    logger.info("Plano atualizado: user=%s plan=%s", user_id, new_plan)
    return {"status": "ok"}