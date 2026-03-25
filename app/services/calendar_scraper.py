import httpx
from bs4 import BeautifulSoup
import re
from datetime import datetime


# ── ECONOMIC CALENDAR ─────────────────────────────────────────────────────────
def scrape_forex_factory() -> list:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
        }

        resp = httpx.get(
            "https://www.forexfactory.com/calendar",
            headers=headers,
            timeout=15,
            follow_redirects=True,
        )

        soup = BeautifulSoup(resp.text, "html.parser")
        events = []
        current_date = ""

        rows = soup.select("tr.calendar__row--day-breaker, tr.calendar__row")

        for row in rows:
            if "calendar__row--day-breaker" in row.get("class", []):
                date_span = row.select_one("span")
                if date_span:
                    current_date = date_span.get_text(strip=True)
                continue

            if "calendar__row--header" in row.get("class", []):
                continue

            time_cell     = row.select_one("td.calendar__time")
            currency_cell = row.select_one("td.calendar__currency")
            impact_cell   = row.select_one("td.calendar__impact")
            event_cell    = row.select_one("td.calendar__event")
            actual_cell   = row.select_one("td.calendar__actual")
            forecast_cell = row.select_one("td.calendar__forecast")
            previous_cell = row.select_one("td.calendar__previous")

            currency = currency_cell.get_text(strip=True) if currency_cell else ""
            if not currency:
                continue

            impact = "low"
            if impact_cell:
                span = impact_cell.select_one("span")
                if span:
                    cls = " ".join(span.get("class", []))
                    if "red" in cls or "high" in cls:
                        impact = "high"
                    elif "orange" in cls or "medium" in cls or "yel" in cls:
                        impact = "medium"

            event_title = ""
            if event_cell:
                title_span = event_cell.select_one("span.calendar__event-title")
                event_title = title_span.get_text(strip=True) if title_span else event_cell.get_text(strip=True)

            if not event_title:
                continue

            def clean(cell):
                if not cell:
                    return ""
                t = cell.get_text(strip=True)
                t = re.sub(r'[▲▼↑↓]', '', t).strip()
                return re.sub(r'\s+', '', t)

            events.append({
                "date":     current_date,
                "time":     time_cell.get_text(strip=True) if time_cell else "",
                "currency": currency,
                "impact":   impact,
                "event":    event_title,
                "actual":   clean(actual_cell),
                "forecast": clean(forecast_cell),
                "previous": clean(previous_cell),
            })

        if len(events) < 3:
            return _fallback_events()

        return events[:60]

    except Exception as e:
        print(f"[calendar_scraper] failed: {e}")
        return _fallback_events()


def _fallback_events() -> list:
    return [
        {"date": "Today", "time": "08:30", "currency": "USD", "impact": "high",   "event": "CPI m/m",                   "actual": "",      "forecast": "0.3%",  "previous": "0.4%"},
        {"date": "Today", "time": "10:00", "currency": "USD", "impact": "high",   "event": "Fed Chair Powell Speaks",   "actual": "",      "forecast": "",       "previous": ""},
        {"date": "Today", "time": "12:30", "currency": "EUR", "impact": "high",   "event": "ECB Interest Rate Decision","actual": "",      "forecast": "4.50%", "previous": "4.50%"},
        {"date": "Today", "time": "14:00", "currency": "GBP", "impact": "medium", "event": "Retail Sales m/m",          "actual": "",      "forecast": "0.2%",  "previous": "-0.3%"},
        {"date": "Today", "time": "15:30", "currency": "USD", "impact": "high",   "event": "NFP Employment Change",     "actual": "",      "forecast": "185K",  "previous": "199K"},
        {"date": "Today", "time": "17:00", "currency": "USD", "impact": "low",    "event": "FOMC Meeting Minutes",      "actual": "",      "forecast": "",       "previous": ""},
    ]


# ── MARKET NEWS — RSS FEEDS ───────────────────────────────────────────────────
NEWS_FEEDS = [
    {
        "url":      "https://www.forexlive.com/feed/news",
        "source":   "ForexLive",
        "category": "Markets",
    },
    {
        "url":      "https://www.investing.com/rss/news.rss",
        "source":   "Investing.com",
        "category": "Markets",
    },
    {
        "url":      "https://feeds.reuters.com/reuters/businessNews",
        "source":   "Reuters",
        "category": "Business",
    },
    {
        "url":      "https://www.marketwatch.com/rss/topstories",
        "source":   "MarketWatch",
        "category": "Markets",
    },
]

FOREX_KEYWORDS = [
    "gold","xau","xauusd","fed","fomc","federal reserve","dollar","usd",
    "euro","eur","eurusd","pound","gbp","gbpusd","yen","jpy","usdjpy",
    "inflation","cpi","ppi","nfp","non-farm","payroll","gdp",
    "bitcoin","btc","ethereum","eth","cryptocurrency","crypto",
    "crude oil","brent","wti","forex","currency","currencies",
    "central bank","interest rate","rate hike","rate cut","rate decision",
    "monetary policy","powell","lagarde","boj","ecb","boe","rba","rbnz",
    "treasury","yield","bond","commodity","commodities","fx ",
    "exchange rate","trade balance","current account","unemployment",
]

# These must NOT appear as the primary topic — filters out noise
FOREX_BLOCKLIST = [
    "social media","young people","happiness","teen","celebrity",
    "recipe","sports","movie","film","tv show","election","politics",
    "vaccine","health","cancer","hospital","school","education",
    "real estate","housing","mortgage","retail","amazon","apple iphone",
    "samsung","gaming","video game","fashion","climate","weather",
]


def scrape_forex_factory_news() -> list:
    """
    Scrapes multiple financial RSS feeds, filters for forex/market relevance,
    extracts full content and generates trading analysis inline.
    No external links returned — all content displayed in-app.
    """
    all_articles = []

    for feed in NEWS_FEEDS:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; PesaPipsBot/1.0)",
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
            }
            resp = httpx.get(feed["url"], headers=headers, timeout=10, follow_redirects=True)
            soup = BeautifulSoup(resp.content, "xml")

            items = soup.find_all("item")
            if not items:
                items = soup.find_all("entry")

            for item in items[:15]:
                title_el   = item.find("title")
                desc_el    = item.find("description") or item.find("summary") or item.find("content")
                pubdate_el = item.find("pubDate") or item.find("published") or item.find("updated")

                title = title_el.get_text(strip=True) if title_el else ""
                if not title or len(title) < 15:
                    continue



                # Get raw description early so filter can use it
                raw_desc = desc_el.get_text(strip=True) if desc_el else ""

                # Filter — only forex/market relevant articles
                title_lower = title.lower()
                combined = (title + " " + raw_desc).lower()

                # Block irrelevant topics
                if any(bl in title_lower for bl in FOREX_BLOCKLIST):
                    continue

                # Must contain at least one forex keyword
                if not any(kw in combined for kw in FOREX_KEYWORDS):
                    continue

                # Clean description
                clean_desc = re.sub(r'<[^>]+>', '', raw_desc)
                clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()
                if len(clean_desc) > 320:
                    clean_desc = clean_desc[:317] + "..."

                # Parse publish time
                time_str = ""
                if pubdate_el:
                    raw_time = pubdate_el.get_text(strip=True)
                    try:
                        from email.utils import parsedate_to_datetime
                        dt = parsedate_to_datetime(raw_time)
                        now_dt = datetime.now(dt.tzinfo)
                        diff = now_dt - dt
                        mins = int(diff.total_seconds() / 60)
                        if mins < 60:
                            time_str = f"{mins}m ago"
                        elif mins < 1440:
                            time_str = f"{mins // 60}h ago"
                        else:
                            time_str = f"{mins // 1440}d ago"
                    except Exception:
                        time_str = raw_time[:16] if len(raw_time) > 16 else raw_time

                category = _guess_category(title)
                tags      = _extract_tags(title + " " + clean_desc)
                analysis  = _generate_analysis(title, clean_desc, tags)

                title = _clean_title(title)
                all_articles.append({
                    "title":    title,
                    "time":     time_str,
                    "source":   feed["source"],
                    "category": category,
                    "summary":  clean_desc or analysis,
                    "analysis": analysis,
                    "tags":     tags,
                })

        except Exception as e:
            print(f"[news] feed {feed['source']} failed: {e}")
            continue

    # Deduplicate by similar title
    seen = set()
    unique = []
    for art in all_articles:
        key = art["title"][:40].lower()
        if key not in seen:
            seen.add(key)
            unique.append(art)

    # Sort by recency (articles with "m ago" first)
    def sort_key(a):
        t = a.get("time", "")
        if "m ago" in t:
            return int(t.replace("m ago", "").strip() or "999")
        if "h ago" in t:
            return int(t.replace("h ago", "").strip() or "99") * 60
        return 9999

    unique.sort(key=sort_key)

    if len(unique) < 3:
        return _fallback_news()

    return unique[:20]


def _guess_category(title: str) -> str:
    t = title.lower()
    if any(w in t for w in ["gold", "xau", "silver", "oil", "crude", "commodity"]): return "Commodities"
    if any(w in t for w in ["bitcoin", "btc", "crypto", "eth", "ethereum"]):        return "Crypto"
    if any(w in t for w in ["fed", "fomc", "dollar", "usd", "powell"]):             return "USD"
    if any(w in t for w in ["euro", "eur", "ecb", "lagarde"]):                      return "EUR"
    if any(w in t for w in ["pound", "gbp", "boe", "bailey"]):                      return "GBP"
    if any(w in t for w in ["yen", "jpy", "boj", "japan"]):                         return "JPY"
    if any(w in t for w in ["aussie", "aud", "rba"]):                               return "AUD"
    if any(w in t for w in ["nasdaq", "s&p", "dow", "stocks", "equities"]):         return "Equities"
    return "Markets"


def _extract_tags(text: str) -> list:
    tags = []
    t = text.lower()
    checks = [
        (["xauusd","xau/usd","gold price","spot gold","gold futures","gold rally",
          "gold drops","gold rises","gold surges","gold falls","gold weakens",
          "gold strengthens","bullion","precious metal"],                                                              "XAUUSD"),
        (["eurusd","eur/usd","euro dollar","euro weakens","euro strengthens","ecb rate",
          "european central bank","eurozone","euro area","lagarde"],                                                   "EURUSD"),
        (["gbpusd","gbp/usd","pound dollar","cable","sterling","boe rate",
          "bank of england","uk inflation","uk cpi","uk gdp","british pound"],                                        "GBPUSD"),
        (["usdjpy","usd/jpy","dollar yen","yen weakens","yen strengthens","boj rate",
          "bank of japan","japan inflation","japanese yen","yen rallies"],                                            "USDJPY"),
        (["btcusd","bitcoin","btc price","crypto rally","crypto selloff",
          "ethereum","crypto market","digital asset","btc/usd"],                                                      "BTCUSD"),
        (["audusd","aud/usd","aussie dollar","rba rate","reserve bank of australia",
          "australian dollar","australia unemployment","australia gdp",
          "australia inflation","new zealand","nzd","rbnz"],                                                          "AUDUSD"),
        (["usdchf","usd/chf","swiss franc","snb rate","swiss national bank"],                                         "USDCHF"),
        (["usdcad","usd/cad","canadian dollar","loonie","boc rate",
          "bank of canada","canada inflation","canada gdp","canada jobs"],                                            "USDCAD"),
        (["federal reserve","fed rate","fomc","powell","us inflation","us cpi",
          "us ppi","nfp","non-farm","us jobs","usd index","dollar index",
          "dxy","us gdp","us economy","trump tariff","tariff"],                                                       "USD"),
    ]
    for keywords_list, pair in checks:
        if any(kw in t for kw in keywords_list) and pair not in tags:
            tags.append(pair)
    return tags[:4]


def _clean_title(title: str) -> str:
    """Remove RSS feed prefixes and clean up titles."""
    # Remove known feed prefixes that bleed into titles
    prefixes = [
        "investinglive", "investing.com -", "marketwatch -",
        "reuters -", "forexlive -", "bloomberg -",
    ]
    t = title.strip()
    t_lower = t.lower()
    for prefix in prefixes:
        if t_lower.startswith(prefix):
            t = t[len(prefix):].strip(" -–:|")
    # Capitalise first letter
    return t[0].upper() + t[1:] if t else title


def _generate_analysis(title: str, summary: str, tags: list) -> str:
    t = (title + " " + summary).lower()

    if "rate hike" in t or ("rate" in t and "hike" in t):
        return "Rate hike signals tighter monetary policy. Expect currency strength and potential gold weakness as yields rise and risk appetite shifts."
    if "rate cut" in t or ("rate" in t and "cut" in t):
        return "Rate cut expectations typically weaken the local currency and support gold as a lower-yield environment makes the metal more attractive."
    if "inflation" in t and ("high" in t or "rise" in t or "surge" in t or "hot" in t):
        return "Above-forecast inflation increases central bank rate hike pressure. Watch for currency strength and gold volatility as market reprices rate expectations."
    if "inflation" in t and ("low" in t or "cool" in t or "fall" in t or "drop" in t):
        return "Cooling inflation may reduce rate hike urgency. Could support equities and gold while pressuring the local currency on dovish repricing."
    if "gold" in t and ("rise" in t or "surge" in t or "rally" in t or "high" in t):
        return "Gold is rallying — monitor USD weakness, falling real yields, or safe-haven demand as drivers. XAU/USD upside momentum could extend if fundamentals hold."
    if "gold" in t and ("fall" in t or "drop" in t or "decline" in t or "low" in t):
        return "Gold is under pressure. Rising dollar or yields may be driving the selloff. Watch 2300 as key support. A break lower could accelerate to 2270."
    if "fed" in t or "fomc" in t or "powell" in t:
        return "Fed communication in focus. Hawkish tone = USD bullish, gold bearish. Dovish pivot signals = USD soft, gold and risk assets supported."
    if "nfp" in t or "jobs" in t or "employment" in t or "payroll" in t:
        return "Employment data directly influences Fed policy expectations. Strong jobs = rate hike pressure = USD bullish, gold bearish. Weak jobs = opposite."
    if "bitcoin" in t or "crypto" in t:
        return "Crypto market moving. Risk-on conditions support BTC. Watch correlation with equities and USD. High volatility expected — manage position sizing carefully."
    if "oil" in t or "crude" in t:
        return "Oil price movements affect inflation expectations and commodity currencies (CAD, NOK). Rising oil = inflation upside risk = hawkish central bank pressure."
    if tags:
        pair = tags[0]
        return f"Relevant to {pair}. Monitor price action for confirmation of directional bias. Check key levels and indicator confluence before entering any position."
    return "Monitor price action across USD pairs and commodities. Check your active strategy signal before making any trading decisions."


def _fallback_news() -> list:
    return [
        {"title": "Gold surges past $2,340 as Fed signals rate pause",            "time": "2h ago",  "source": "ForexLive",    "category": "Commodities", "summary": "Gold prices have pushed above key resistance at $2,340 after Federal Reserve officials signalled a potential pause in the rate hiking cycle.", "analysis": "Gold rally driven by dovish Fed signals. Watch $2,350 as next resistance. USD weakness is the key driver — monitor DXY for confirmation.", "tags": ["XAUUSD","USD"]},
        {"title": "USD weakens ahead of FOMC meeting minutes release",            "time": "3h ago",  "source": "Reuters",      "category": "USD",         "summary": "The US dollar index pulled back from recent highs as traders positioned cautiously ahead of the FOMC minutes due later today.", "analysis": "USD softness ahead of FOMC creates short-term headwind for dollar bulls. Gold and EUR/USD may see temporary upside until minutes are digested.", "tags": ["USD","EURUSD"]},
        {"title": "ECB holds rates steady, Lagarde signals caution on cuts",       "time": "4h ago",  "source": "Reuters",      "category": "EUR",         "summary": "The European Central Bank kept its benchmark rate unchanged at 4.50%, with President Lagarde emphasising data dependency before any easing.", "analysis": "ECB on hold is neutral for EUR short term. Lagarde's cautious tone supports EUR vs currencies where cuts are priced in more aggressively.", "tags": ["EURUSD","EUR"]},
        {"title": "Bitcoin consolidates near $68,000 after weekend rally",        "time": "5h ago",  "source": "MarketWatch",  "category": "Crypto",      "summary": "Bitcoin is holding above $67,500 support after a sharp weekend rally driven by ETF inflow data and improving risk appetite across markets.", "analysis": "BTC consolidation after rally is healthy. Watch $70,000 as key psychological resistance. Risk appetite improvement supports continued upside.", "tags": ["BTCUSD"]},
        {"title": "US Core PPI beats forecast, reignites inflation fears",        "time": "6h ago",  "source": "ForexLive",    "category": "USD",         "summary": "US Producer Price Index came in at 0.5% versus the 0.3% forecast, suggesting pipeline inflation pressure remains elevated heading into the CPI print.", "analysis": "Hot PPI is a leading indicator for CPI. USD bullish on rate hike repricing. Gold may face short-term pressure but inflation hedge demand could limit downside.", "tags": ["USD","XAUUSD"]},
        {"title": "Oil prices rise on Middle East supply concerns",               "time": "7h ago",  "source": "Reuters",      "category": "Commodities", "summary": "Crude oil futures advanced 1.2% as geopolitical tensions in the Middle East raised concerns about supply disruptions from key producing regions.", "analysis": "Oil supply risk supports commodity currencies (CAD). Rising oil adds to inflation concerns globally, keeping central banks cautious on rate cuts.", "tags": ["USD"]},
    ]


def get_news_with_fallback() -> list:
    """
    Tries live RSS feeds first. If network is blocked or parsing fails,
    returns enriched fallback data. Always returns usable articles.
    """
    try:
        articles = scrape_forex_factory_news()
        # If we only got fallback articles (no real 'source' variation), note it
        sources = set(a.get("source","") for a in articles)
        live = len(sources) > 2 or any(a.get("time","").endswith("ago") for a in articles)
        for a in articles:
            a["is_live"] = live
        return articles
    except Exception:
        fb = _fallback_news()
        for a in fb:
            a["is_live"] = False
        return fb
