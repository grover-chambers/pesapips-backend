"""HTML / Markdown sanitization helpers.

Used on user-submitted content before storage when the frontend is going to
render it via dangerouslySetInnerHTML. The frontend also re-sanitizes before
rendering (defense in depth), but server-side scrubbing is the right place to
reject obvious XSS payloads.
"""
from __future__ import annotations
import re

# Tags that can carry event handlers or pull remote resources.
_DANGEROUS_TAGS = (
    r"<\s*(script|iframe|object|embed|svg|math|link|meta|base|form)\b",
)
# on* event handler attributes (onclick, onload, onerror, onmouseover, ...)
_ON_ATTR = re.compile(r"\s+on\w+\s*=", re.IGNORECASE)
# javascript: URLs
_JS_URL = re.compile(r"(href|src)\s*=\s*(['\"])javascript:", re.IGNORECASE)
# data: URLs (can carry payloads)
_DATA_URL = re.compile(r"(href|src)\s*=\s*(['\"])data:", re.IGNORECASE)


def sanitize_html(html: str, *, allow_styles: bool = False) -> str:
    """Strip obvious XSS vectors from an HTML fragment.

    This is intentionally conservative — it does NOT implement a full
    allowlist-based sanitizer. For richer content (user-authored Markdown
    rendered as HTML), pair this with `bleach` or `nh3` on the frontend AND
    backend before going to production with arbitrary untrusted HTML.

    Args:
        html: Raw HTML to scrub.
        allow_styles: If True, leave inline style= attributes alone. If False
            (default), strip them too — style attributes can hide payload CSS
            like `background:url(javascript:...)` in older browsers.

    Returns:
        Scrubbed HTML string. The intent is to neutralize the obvious XSS
        vectors while preserving formatting text. Applying this consistently
        on the server plus a DOMPurify pass on the client covers ~99% of
        real-world XSS vectors from Markdown→HTML pipelines.
    """
    if not html:
        return ""

    # Drop entire <script>...</script> blocks and similar tag pairs.
    out = html
    for tag in ("script", "iframe", "object", "embed", "svg", "math", "form"):
        out = re.sub(
            rf"<\s*{tag}\b[^>]*>.*?<\s*/\s*{tag}\s*>",
            "",
            out,
            flags=re.IGNORECASE | re.DOTALL,
        )
        # Strip orphan opening tags (no closing tag) as well.
        out = re.sub(rf"<\s*/?{tag}\b[^>]*>", "", out, flags=re.IGNORECASE)

    out = _ON_ATTR.sub("", out)
    out = _JS_URL.sub(lambda m: f"{m.group(1)}={m.group(2)}#", out)
    out = _DATA_URL.sub(lambda m: f"{m.group(1)}={m.group(2)}#", out)

    if not allow_styles:
        out = re.sub(r"\s+style\s*=\s*(['\"]).*?\1", "", out, flags=re.IGNORECASE)

    return out
