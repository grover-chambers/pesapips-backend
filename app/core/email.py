import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "PesaPips <noreply@pesapips.com>")


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send an email. Returns True on success, False on failure."""
    if not SMTP_USER or not SMTP_PASS or SMTP_PASS == "your_gmail_app_password_here":
        print(f"[EMAIL SKIPPED] To: {to} | Subject: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to

        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())

        print(f"[EMAIL SENT] To: {to} | Subject: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


# ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────

BASE_STYLE = """
    body { margin:0; padding:0; background:#0a0b0e; font-family:'Inter',sans-serif; }
    .wrap { max-width:560px; margin:0 auto; background:#111318; border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; }
    .header { background:#111318; padding:28px 32px 20px; border-bottom:1px solid rgba(255,255,255,0.06); }
    .logo { font-size:18px; font-weight:700; color:#d4a843; letter-spacing:2px; }
    .body { padding:28px 32px; }
    .footer { padding:16px 32px; border-top:1px solid rgba(255,255,255,0.06); font-size:11px; color:#5a6070; }
    h2 { color:#e8e8ec; font-size:20px; margin:0 0 12px; }
    p { color:#9a9eb0; font-size:14px; line-height:1.7; margin:0 0 14px; }
    .btn { display:inline-block; padding:11px 24px; background:#d4a843; color:#000; font-weight:600; font-size:13px; border-radius:8px; text-decoration:none; }
    .stat { background:#181b22; border-radius:8px; padding:14px 16px; margin-bottom:12px; }
    .stat-label { font-size:10px; color:#5a6070; letter-spacing:0.12em; margin-bottom:4px; }
    .stat-value { font-size:20px; color:#e8e8ec; font-weight:700; }
    .badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; letter-spacing:0.1em; }
    .badge-green { background:rgba(61,214,140,0.1); color:#3dd68c; }
    .badge-red { background:rgba(240,79,90,0.1); color:#f04f5a; }
    .badge-gold { background:rgba(212,168,67,0.1); color:#d4a843; }
"""

def _wrap(content: str) -> str:
    return f"""<!DOCTYPE html><html><head><style>{BASE_STYLE}</style></head>
<body><div style="padding:24px 16px">
<div class="wrap">
  <div class="header"><div class="logo">PESAPIPS</div></div>
  <div class="body">{content}</div>
  <div class="footer">PesaPips Trading AI · Nairobi, Kenya · <a href="https://pesapips.com" style="color:#d4a843">pesapips.com</a></div>
</div></div></body></html>"""


def email_welcome(to: str, name: str) -> bool:
    html = _wrap(f"""
        <h2>Welcome to PesaPips, {name} 👋</h2>
        <p>Your account is ready. Connect your MT5 broker, run your first signal and let the AI engine do the heavy lifting.</p>
        <p><a href="https://pesapips.com/dashboard" class="btn">Open your dashboard →</a></p>
        <p style="margin-top:20px">If you have any questions, join our Discord community or email us at support@pesapips.com</p>
    """)
    return send_email(to, "Welcome to PesaPips", html)


def email_ticket_received(to: str, name: str, ticket_id: int, subject: str) -> bool:
    html = _wrap(f"""
        <h2>We received your ticket</h2>
        <div class="stat">
            <div class="stat-label">TICKET</div>
            <div class="stat-value">#{ticket_id}</div>
        </div>
        <p><strong style="color:#e8e8ec">{subject}</strong></p>
        <p>Our team will review it and get back to you within 24 hours. You can reply directly to this email.</p>
    """)
    return send_email(to, f"Ticket #{ticket_id} received — {subject}", html)


def email_ticket_updated(to: str, name: str, ticket_id: int, subject: str, status: str, note: Optional[str] = None) -> bool:
    status_badge = {
        "open": "badge-gold", "in_progress": "badge-gold",
        "resolved": "badge-green", "closed": "badge-green"
    }.get(status, "badge-gold")

    note_html = f'<div class="stat"><p style="margin:0">{note}</p></div>' if note else ""
    html = _wrap(f"""
        <h2>Your ticket has been updated</h2>
        <div class="stat">
            <div class="stat-label">TICKET #{ticket_id}</div>
            <div class="stat-value" style="font-size:15px">{subject}</div>
        </div>
        <p>Status: <span class="badge {status_badge}">{status.replace('_',' ').upper()}</span></p>
        {note_html}
        <p>Reply to this email or visit your dashboard to respond.</p>
    """)
    return send_email(to, f"Ticket #{ticket_id} updated — {status.replace('_',' ').title()}", html)


def email_announcement(to: str, title: str, body: str, ann_type: str) -> bool:
    color = {"info": "#5b9cf6", "warning": "#f0934f", "success": "#3dd68c", "critical": "#f04f5a"}.get(ann_type, "#5b9cf6")
    html = _wrap(f"""
        <h2 style="color:{color}">{title}</h2>
        <p>{body}</p>
        <p><a href="https://pesapips.com/dashboard" class="btn">Open dashboard →</a></p>
    """)
    return send_email(to, f"PesaPips — {title}", html)


def email_trade_opened(to: str, symbol: str, trade_type: str, lot: float, entry: float) -> bool:
    color = "#3dd68c" if trade_type == "BUY" else "#f04f5a"
    html = _wrap(f"""
        <h2>Trade Opened</h2>
        <div class="stat">
            <div class="stat-label">SYMBOL</div>
            <div class="stat-value">{symbol}</div>
        </div>
        <div style="display:flex;gap:12px">
            <div class="stat" style="flex:1">
                <div class="stat-label">TYPE</div>
                <div class="stat-value" style="color:{color}">{trade_type}</div>
            </div>
            <div class="stat" style="flex:1">
                <div class="stat-label">LOT</div>
                <div class="stat-value">{lot}</div>
            </div>
            <div class="stat" style="flex:1">
                <div class="stat-label">ENTRY</div>
                <div class="stat-value">{entry}</div>
            </div>
        </div>
        <p>Your AI engine has opened a new position. Monitor it in your dashboard.</p>
        <p><a href="https://pesapips.com/dashboard" class="btn">View position →</a></p>
    """)
    return send_email(to, f"Trade opened — {trade_type} {symbol}", html)


def email_trade_closed(to: str, symbol: str, trade_type: str, profit: float) -> bool:
    color  = "#3dd68c" if profit >= 0 else "#f04f5a"
    sign   = "+" if profit >= 0 else ""
    result = "WIN" if profit >= 0 else "LOSS"
    html = _wrap(f"""
        <h2>Trade Closed</h2>
        <div class="stat">
            <div class="stat-label">RESULT</div>
            <div class="stat-value" style="color:{color}">{sign}${profit:.2f} — {result}</div>
        </div>
        <p>{trade_type} {symbol} has been closed.</p>
        <p><a href="https://pesapips.com/dashboard" class="btn">View trade history →</a></p>
    """)
    return send_email(to, f"Trade closed — {sign}${profit:.2f} on {symbol}", html)


def email_password_reset(to: str, name: str, new_password: str) -> bool:
    html = _wrap(f"""
        <h2>Your password has been reset</h2>
        <p>An admin has reset your PesaPips password.</p>
        <div class="stat">
            <div class="stat-label">NEW PASSWORD</div>
            <div class="stat-value" style="font-size:16px;font-family:monospace">{new_password}</div>
        </div>
        <p>Please log in and change your password immediately in Settings → Security.</p>
        <p><a href="https://pesapips.com/login" class="btn">Log in →</a></p>
    """)
    return send_email(to, "Your PesaPips password has been reset", html)
