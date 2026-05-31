import secrets
import string
from urllib.parse import urlparse

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import redirect, render

from .models import Link

ALPHABET = string.ascii_lowercase + string.digits


def healthz(request):
    return HttpResponse("ok", content_type="text/plain")


def _config():
    return settings.APP_CONFIG


def _next_code() -> str:
    """Pick the next code per the id_strategy param."""
    if _config()["id_strategy"] == "sequential":
        last = Link.objects.order_by("-id").first()
        n = (last.id + 1) if last else 1
        return f"{n:04d}"
    return "".join(secrets.choice(ALPHABET) for _ in range(6))


def _normalize_target(raw: str) -> tuple[str | None, str | None]:
    """Returns (url, error). Enforces the require_https param."""
    raw = (raw or "").strip()
    if not raw:
        return None, "Enter a URL to shorten."
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None, "Enter a full URL including http:// or https://."
    if _config()["require_https"] and parsed.scheme != "https":
        return None, "This instance requires https:// links (require_https is on)."
    return raw, None


def index(request):
    cfg = _config()
    links = Link.objects.all()[:50]
    return render(
        request,
        "shortener/index.html",
        {
            "cfg": cfg,
            "links": links,
            "count": Link.objects.count(),
            "at_capacity": Link.objects.count() >= cfg["max_links"],
        },
    )


def shorten(request):
    if request.method != "POST":
        return redirect("index")

    cfg = _config()
    if Link.objects.count() >= cfg["max_links"]:
        return _render_with_error(
            request, f"Link limit reached ({cfg['max_links']}). Configured via max_links."
        )

    target, error = _normalize_target(request.POST.get("target", ""))
    if error:
        return _render_with_error(request, error)

    for _ in range(5):
        try:
            with transaction.atomic():
                Link.objects.create(code=_next_code(), target=target)
            break
        except IntegrityError:
            continue
    return redirect("index")


def _render_with_error(request, message: str):
    cfg = _config()
    return render(
        request,
        "shortener/index.html",
        {
            "cfg": cfg,
            "links": Link.objects.all()[:50],
            "count": Link.objects.count(),
            "at_capacity": Link.objects.count() >= cfg["max_links"],
            "error": message,
        },
        status=400,
    )


def follow(request, code: str):
    try:
        link = Link.objects.get(code=code)
    except Link.DoesNotExist:
        return redirect(_config()["default_redirect_url"])
    Link.objects.filter(pk=link.pk).update(clicks=F("clicks") + 1)
    return HttpResponseRedirect(link.target)
