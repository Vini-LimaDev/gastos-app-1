"""
whatsapp.py — Integração WhatsApp via Twilio + NLP com Groq

Fluxo:
  1. Twilio chama /api/whatsapp/webhook com a mensagem do usuário
  2. Identifica o usuário pelo número de telefone (tabela profiles)
  3. Se número não cadastrado → orienta a vincular no app
  4. Se mensagem é resposta de confirmação (sim/não) → processa
  5. Se nova mensagem → IA extrai transação → pede confirmação
  6. "sim" → salva transação → responde com resumo
  7. "não" → cancela e descarta sessão pendente
"""

import os
import json
import hmac
import hashlib
import base64
import logging
from datetime import date, datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, Form
from fastapi.responses import PlainTextResponse
from database import supabase_admin as supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# ── Configurações ─────────────────────────────────────────
TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER", "")  # ex: whatsapp:+14155238886
GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL           = "llama-3.3-70b-versatile"

VALID_CATEGORIES = [
    "Alimentação", "Transporte", "Moradia", "Saúde",
    "Lazer", "Educação", "Vestuário", "Outros"
]

# ── Palavras de confirmação / cancelamento ────────────────
CONFIRM_WORDS = {"sim", "s", "yes", "y", "confirma", "confirmar", "ok", "pode", "salva", "salvar"}
CANCEL_WORDS  = {"não", "nao", "n", "no", "cancela", "cancelar", "cancel", "errado", "errada"}


# ═══════════════════════════════════════════════════════════
# SEGURANÇA — Validação de assinatura Twilio
# ═══════════════════════════════════════════════════════════

def _validate_twilio_signature(request_url: str, post_params: dict, signature: str) -> bool:
    """
    Valida que a requisição veio de fato da Twilio.
    Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
    """
    if not TWILIO_AUTH_TOKEN:
        logger.warning("TWILIO_AUTH_TOKEN não configurado — pulando validação de assinatura")
        return True  # Em dev sem token configurado, permite passar

    # Monta a string: URL + params ordenados alfabeticamente
    sorted_params = sorted(post_params.items())
    s = request_url + "".join(f"{k}{v}" for k, v in sorted_params)

    expected = base64.b64encode(
        hmac.new(
            TWILIO_AUTH_TOKEN.encode("utf-8"),
            s.encode("utf-8"),
            hashlib.sha1
        ).digest()
    ).decode("utf-8")

    return hmac.compare_digest(expected, signature)


# ═══════════════════════════════════════════════════════════
# TWILIO — Enviar mensagem
# ═══════════════════════════════════════════════════════════

async def send_whatsapp_message(to: str, body: str) -> bool:
    """Envia mensagem WhatsApp via Twilio REST API."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.error("Credenciais Twilio não configuradas")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                url,
                data={"From": TWILIO_PHONE_NUMBER, "To": to, "Body": body},
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=10.0,
            )
            if resp.status_code not in (200, 201):
                logger.error(f"Twilio erro {resp.status_code}: {resp.text}")
                return False
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem Twilio: {e}")
            return False


# ═══════════════════════════════════════════════════════════
# GROQ — Extrair transação do texto
# ═══════════════════════════════════════════════════════════

EXTRACTION_PROMPT = """Você é um assistente financeiro. Extraia do texto a seguir os dados de uma transação financeira.

Responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem blocos de código.

Formato esperado:
{{
  "description": "descrição curta da transação",
  "amount": 0.00,
  "type": "expense" ou "income",
  "category": "uma das categorias abaixo",
  "date": "YYYY-MM-DD",
  "notes": null ou "observação extra",
  "confidence": 0.0 a 1.0,
  "missing_info": null ou "campo que está faltando"
}}

Categorias válidas: {categories}

Regras:
- "type" é "expense" para gastos/pagamentos e "income" para recebimentos/salários
- Se não houver valor na mensagem, coloque amount=0 e missing_info="valor"
- "date" deve ser hoje ({today}) se não mencionada
- "confidence" indica sua certeza de 0 a 1
- Responda SEMPRE em JSON, nunca em texto livre

Texto: "{text}"
"""

async def extract_transaction(text: str) -> dict | None:
    """Usa Groq para extrair dados estruturados de uma mensagem em linguagem natural."""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY não configurada")
        return None

    prompt = EXTRACTION_PROMPT.format(
        categories=", ".join(VALID_CATEGORIES),
        today=date.today().isoformat(),
        text=text,
    )

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 300,
                },
                timeout=15.0,
            )

            if resp.status_code != 200:
                logger.error(f"Groq erro {resp.status_code}: {resp.text}")
                return None

            content = resp.json()["choices"][0]["message"]["content"].strip()

            # Remove blocos de código se o modelo os incluiu mesmo assim
            content = content.replace("```json", "").replace("```", "").strip()

            return json.loads(content)

        except json.JSONDecodeError as e:
            logger.error(f"Groq retornou JSON inválido: {e}")
            return None
        except Exception as e:
            logger.error(f"Erro ao chamar Groq: {e}")
            return None


# ═══════════════════════════════════════════════════════════
# BANCO — Sessões pendentes e transações
# ═══════════════════════════════════════════════════════════

def get_user_by_phone(phone: str) -> dict | None:
    """Busca usuário pelo número de telefone cadastrado no perfil."""
    # Normaliza o número (remove prefixo whatsapp: e o +)
    clean_phone = phone.replace("whatsapp:", "").replace("+", "").strip()

    result = supabase.table("profiles") \
        .select("id, name, email, phone") \
        .or_(f"phone.eq.{phone},phone.eq.+{clean_phone},phone.eq.{clean_phone}") \
        .execute()

    return result.data[0] if result.data else None


def get_pending_session(phone: str) -> dict | None:
    """Busca sessão pendente (aguardando confirmação) para o número."""
    result = supabase.table("whatsapp_pending") \
        .select("*") \
        .eq("phone", phone) \
        .gt("expires_at", datetime.utcnow().isoformat()) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    return result.data[0] if result.data else None


def save_pending_session(phone: str, user_id: str, transaction: dict) -> bool:
    """Salva sessão pendente, removendo qualquer anterior do mesmo número."""
    try:
        # Remove sessão anterior desse número (se existir)
        supabase.table("whatsapp_pending") \
            .delete() \
            .eq("phone", phone) \
            .execute()

        supabase.table("whatsapp_pending").insert({
            "phone": phone,
            "user_id": user_id,
            "description": transaction["description"],
            "amount": transaction["amount"],
            "type": transaction["type"],
            "category": transaction["category"],
            "date": transaction["date"],
            "notes": transaction.get("notes"),
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar sessão pendente: {e}")
        return False


def delete_pending_session(phone: str):
    """Remove sessão pendente do número."""
    supabase.table("whatsapp_pending").delete().eq("phone", phone).execute()


def commit_transaction(session: dict) -> dict | None:
    """Salva a transação definitivamente na tabela transactions."""
    try:
        result = supabase.table("transactions").insert({
            "user_id": session["user_id"],
            "description": session["description"],
            "amount": float(session["amount"]),
            "type": session["type"],
            "category": session["category"],
            "date": session["date"],
            "notes": session.get("notes"),
            "is_recurring": False,
        }).execute()

        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Erro ao salvar transação: {e}")
        return None


# ═══════════════════════════════════════════════════════════
# MENSAGENS DE RESPOSTA
# ═══════════════════════════════════════════════════════════

def format_confirmation_message(t: dict) -> str:
    emoji = "💸" if t["type"] == "expense" else "💰"
    tipo  = "Despesa" if t["type"] == "expense" else "Receita"
    valor = f"R$ {float(t['amount']):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    return (
        f"{emoji} *{tipo} identificada:*\n\n"
        f"📝 *Descrição:* {t['description']}\n"
        f"💵 *Valor:* {valor}\n"
        f"📂 *Categoria:* {t['category']}\n"
        f"📅 *Data:* {_format_date(t['date'])}\n"
        f"{'📌 *Nota:* ' + t['notes'] + chr(10) if t.get('notes') else ''}\n"
        f"Está certo? Responda *sim* para salvar ou *não* para cancelar."
    )


def format_success_message(t: dict) -> str:
    valor = f"R$ {float(t['amount']):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return (
        f"✅ *Transação registrada com sucesso!*\n\n"
        f"_{t['description']} — {valor} em {t['category']}_\n\n"
        f"Acesse o GastosApp para ver seus lançamentos. 📊"
    )


def _format_date(date_str: str) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return d.strftime("%d/%m/%Y")
    except Exception:
        return date_str


# ═══════════════════════════════════════════════════════════
# WEBHOOK — Endpoint principal
# ═══════════════════════════════════════════════════════════

@router.post("/webhook", response_class=PlainTextResponse)
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
):
    """
    Endpoint chamado pela Twilio a cada mensagem recebida.
    Retorna 200 OK vazio (a resposta ao usuário é feita via API REST da Twilio).
    """

    # ── 1. Validar assinatura Twilio ──────────────────────
    signature = request.headers.get("X-Twilio-Signature", "")
    request_url = str(request.url)
    form_data = dict(await request.form())

    if not _validate_twilio_signature(request_url, form_data, signature):
        logger.warning(f"Assinatura Twilio inválida para requisição de {From}")
        raise HTTPException(status_code=403, detail="Assinatura inválida")

    phone   = From.strip()
    message = Body.strip()

    logger.info(f"Mensagem recebida de {phone}: {message!r}")

    # ── 2. Identificar usuário pelo telefone ──────────────
    user = get_user_by_phone(phone)

    if not user:
        await send_whatsapp_message(
            phone,
            "👋 Olá! Seu número ainda não está vinculado ao GastosApp.\n\n"
            "Acesse o app, vá em *Configurações → WhatsApp* e cadastre seu número para começar a registrar gastos por aqui! 📱"
        )
        return ""

    # ── 3. Verificar se há sessão pendente de confirmação ─
    pending = get_pending_session(phone)
    normalized = message.lower().strip().rstrip("!.?")

    if pending:
        # ── 3a. Usuário respondeu à confirmação ───────────
        if normalized in CONFIRM_WORDS:
            saved = commit_transaction(pending)
            delete_pending_session(phone)

            if saved:
                await send_whatsapp_message(phone, format_success_message(pending))
            else:
                await send_whatsapp_message(
                    phone,
                    "❌ Ocorreu um erro ao salvar a transação. Tente novamente enviando a mensagem original."
                )
            return ""

        elif normalized in CANCEL_WORDS:
            delete_pending_session(phone)
            await send_whatsapp_message(
                phone,
                "❌ *Transação cancelada.*\n\nSe quiser tentar novamente, é só me mandar outra mensagem! 😊"
            )
            return ""

        else:
            # Usuário mandou outra coisa enquanto havia confirmação pendente
            await send_whatsapp_message(
                phone,
                f"Ainda estou aguardando sua confirmação da transação anterior.\n\n"
                f"{format_confirmation_message(pending)}"
            )
            return ""

    # ── 4. Nenhuma sessão pendente — processar nova mensagem
    await send_whatsapp_message(phone, "⏳ Processando sua mensagem...")

    extracted = await extract_transaction(message)

    # ── 4a. Falha na extração ─────────────────────────────
    if not extracted:
        await send_whatsapp_message(
            phone,
            "😕 Não consegui entender sua mensagem. Tente algo como:\n\n"
            "• _Gastei 50 reais de almoço_\n"
            "• _Paguei 120 de conta de luz_\n"
            "• _Recebi 3000 de salário_"
        )
        return ""

    # ── 4b. Informação faltando (ex: sem valor) ───────────
    if extracted.get("missing_info") == "valor" or extracted.get("amount", 0) <= 0:
        save_pending_session(phone, user["id"], {**extracted, "amount": 0, "date": extracted.get("date", date.today().isoformat())})

        await send_whatsapp_message(
            phone,
            f"Entendi que você quer registrar: *{extracted.get('description', 'uma transação')}*\n\n"
            f"Mas não encontrei o valor. Quanto foi? (Ex: _80_, _R$ 150,50_)"
        )
        return ""

    # ── 4c. Categoria inválida — corrigir para "Outros" ───
    if extracted.get("category") not in VALID_CATEGORIES:
        extracted["category"] = "Outros"

    # ── 4d. Tudo ok — pedir confirmação ───────────────────
    save_pending_session(phone, user["id"], extracted)
    await send_whatsapp_message(phone, format_confirmation_message(extracted))

    return ""


# ── Endpoint de saúde do módulo ───────────────────────────
@router.get("/health")
def whatsapp_health():
    return {
        "status": "ok",
        "twilio_configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN),
        "groq_configured": bool(GROQ_API_KEY),
    }