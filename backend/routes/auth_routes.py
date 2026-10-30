from __future__ import annotations

import secrets
from urllib.parse import urlencode

import requests
from flask import Blueprint, current_app, jsonify, redirect, request, session

import config
from services.auth_service import upsert_google_user
from services.jwt_service import mint_jwt


bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.get("/google")
def auth_google_start():
    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=missing_google_oauth_env")

    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    return redirect(f"{config.GOOGLE_AUTH_URL}?{urlencode(params)}")


@bp.get("/google/callback")
def auth_google_callback():
    error = request.args.get("error")
    if error:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error={error}")

    code = request.args.get("code")
    state = request.args.get("state")
    expected_state = session.pop("oauth_state", None)

    if not code:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=missing_code")
    if not state or state != expected_state:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=state_mismatch")

    try:
        token_resp = requests.post(
            config.GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": config.GOOGLE_CLIENT_ID,
                "client_secret": config.GOOGLE_CLIENT_SECRET,
                "redirect_uri": config.REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except Exception:  # noqa: BLE001
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=token_exchange_failed")

    if not token_resp.ok:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=token_exchange_failed")
    access_token = token_resp.json().get("access_token")
    if not access_token:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=no_access_token")

    try:
        userinfo_resp = requests.get(
            config.GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except Exception:  # noqa: BLE001
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=userinfo_failed")

    if not userinfo_resp.ok:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=userinfo_failed")
    profile = userinfo_resp.json()
    if "sub" not in profile:
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=invalid_userinfo")

    try:
        user_doc = upsert_google_user(profile)
    except Exception:  # noqa: BLE001
        current_app.logger.exception("Mongo upsert failed")
        return redirect(f"{config.FRONTEND_URL}/auth/callback?error=db_error")

    token = mint_jwt(user_doc)
    # Pass the token as a URL fragment so it never appears in server logs,
    # browser history, or Referer headers.
    return redirect(f"{config.FRONTEND_URL}/auth/callback#token={token}")


@bp.post("/logout")
def logout():
    return jsonify({"ok": True})
