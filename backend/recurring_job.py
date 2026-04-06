from datetime import date, datetime
import logging
import calendar
from database import supabase_admin as supabase

logger = logging.getLogger(__name__)


def should_launch_today(recurrence_interval: str, day_of_month: int | None, created_at_str: str) -> bool:
    today = date.today()

    if recurrence_interval == "monthly":
        # Usa day_of_month se disponível, senão cai no dia do created_at
        if day_of_month:
            target_day = day_of_month
        else:
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                target_day = created_at.day
            except Exception:
                return False
        last_day = calendar.monthrange(today.year, today.month)[1]
        effective_day = min(target_day, last_day)
        return today.day == effective_day

    elif recurrence_interval == "weekly":
        try:
            created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            return today.weekday() == created_at.weekday()
        except Exception:
            return False

    elif recurrence_interval == "yearly":
        if day_of_month:
            # Para yearly, usa day_of_month como dia e o mês do created_at
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                return today.day == day_of_month and today.month == created_at.month
            except Exception:
                return False
        else:
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                return today.day == created_at.day and today.month == created_at.month
            except Exception:
                return False

    return False


def already_launched_today(user_id: str, description: str, today_str: str) -> bool:
    try:
        result = (
            supabase.table("transactions")
            .select("id")
            .eq("user_id", user_id)
            .eq("description", description)
            .eq("date", today_str)
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception as e:
        logger.error(f"Erro ao verificar duplicata: {e}")
        return False


def process_recurring_transactions() -> dict:
    today = date.today()
    today_str = str(today)
    launched = 0
    skipped = 0
    errors = 0

    logger.info(f"[RecurringJob] Iniciando processamento para {today_str}")

    try:
        result = supabase.table("recurring_templates").select("*").execute()
        templates = result.data or []
    except Exception as e:
        logger.error(f"[RecurringJob] Erro ao buscar templates: {e}")
        return {"launched": 0, "skipped": 0, "errors": 1, "date": today_str}

    logger.info(f"[RecurringJob] {len(templates)} templates encontrados")

    for t in templates:
        try:
            interval = t.get("recurrence_interval")
            day_of_month = t.get("day_of_month")
            created_at = t.get("created_at", "")
            user_id = t.get("user_id")
            description = t.get("description", "")

            if not interval or not user_id:
                skipped += 1
                continue

            if not should_launch_today(interval, day_of_month, created_at):
                skipped += 1
                continue

            if already_launched_today(user_id, description, today_str):
                logger.info(f"[RecurringJob] Já lançada hoje: '{description}' (user {user_id})")
                skipped += 1
                continue

            supabase.table("transactions").insert({
                "user_id": user_id,
                "description": description,
                "amount": t.get("amount"),
                "type": t.get("type"),
                "category": t.get("category"),
                "date": today_str,
                "notes": t.get("notes"),
                "is_recurring": False,
                "recurrence_interval": None,
            }).execute()

            logger.info(f"[RecurringJob] Lançada: '{description}' (user {user_id})")
            launched += 1

        except Exception as e:
            logger.error(f"[RecurringJob] Erro ao lançar '{t.get('description')}': {e}")
            errors += 1

    summary = {"launched": launched, "skipped": skipped, "errors": errors, "date": today_str}
    logger.info(f"[RecurringJob] Concluído: {summary}")
    return summary