import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API = "https://pesapips-backend.onrender.com"

const C = {
  bg:       "#171a20",
  surface:  "#1f2330",
  surface2: "#262c3a",
  surface3: "#2e3545",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  gold:     "#d4a843",
  goldDim:  "rgba(212,168,67,0.10)",
  goldGlow: "rgba(212,168,67,0.20)",
  green:    "#3dd68c",
  greenDim: "rgba(61,214,140,0.10)",
  red:      "#f06b6b",
  redDim:   "rgba(240,107,107,0.10)",
  blue:     "#5b9cf6",
  blueDim:  "rgba(91,156,246,0.10)",
  text:     "#edeef0",
  text2:    "#9aa0b0",
  text3:    "#5a6070",
  mono:     "'DM Mono', 'Courier New', monospace",
  display:  "'DM Serif Display', Georgia, serif",
  sans:     "'DM Sans', system-ui, sans-serif",
}

const api = axios.create({ baseURL: API })
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("pp_token")
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const NAV = [
  { id: "overview",    icon: "🏠", label: "Overview"      },
  { id: "intel",       icon: "🧬", label: "Market Intel"  },
  { id: "mt5",         icon: "🔌", label: "MT5 Connect"   },
  { id: "strategy",    icon: "🧠", label: "Strategy"      },
  { id: "signal",      icon: "📡", label: "Live Signal"   },
  { id: "backtest",    icon: "🔬", label: "Backtest"      },
  { id: "trades",      icon: "📋", label: "Trade History" },
  { id: "performance", icon: "📈", label: "Performance"   },
  { id: "learn",       icon: "🎓", label: "Learning Hub"  },
  { id: "journal",     icon: "📓", label: "Journal"       },
  { id: "blog",        icon: "✍️", label: "Blog"          },
]

// SHARED COMPONENTS
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "12px 12px 0 0", background: color || C.gold }} />
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 700, color: color || C.gold, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3 }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: C.display, fontSize: 26, color: C.text, letterSpacing: "-0.01em", marginBottom: 4 }}>{title}</h2>
      {sub && <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text2 }}>{sub}</p>}
    </div>
  )
}

// TIER GATE
const TIER_ORDER = { free: 0, pro: 1, elite: 2, platinum: 3 }

function canAccess(userPlan, required) {
  return (TIER_ORDER[userPlan] || 0) >= (TIER_ORDER[required] || 0)
}

function TierGate({ required, userPlan, children, feature = "" }) {
  if (canAccess(userPlan, required)) return children

  const PLAN_COLOR  = { pro: C.blue, elite: C.gold, platinum: "#e2c4f0" }
  const PLAN_PRICE  = { pro: "KSh 2,500/mo", elite: "KSh 5,000/mo", platinum: "KSh 9,000/mo" }
  const PLAN_PERKS  = {
    pro:      ["3 MT5 accounts", "Default + 1 library strategy", "Build up to 3 custom strategies", "Trading Journal", "Backtest analytics", "Email support"],
    elite:    ["5 MT5 accounts", "Default + library + 1 custom strategy", "Build up to 5 custom strategies", "Full performance analytics", "Priority support"],
    platinum: ["Unlimited MT5 accounts", "Unlimited strategy combinations", "Unlimited custom strategies", "Dedicated account manager", "API access"],
  }
  const color = PLAN_COLOR[required] || C.gold
  const perks = PLAN_PERKS[required] || []

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ background: C.surface, border: `1px solid ${color}30`, borderRadius: 16, padding: "40px 48px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: C.display, fontSize: 22, color: C.text, marginBottom: 8 }}>
          {required.charAt(0).toUpperCase() + required.slice(1)} Feature
        </div>
        {feature && (
          <div style={{ fontFamily: C.mono, fontSize: 10, color: color, letterSpacing: "0.12em", marginBottom: 16 }}>{feature.toUpperCase()}</div>
        )}
        <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.7, marginBottom: 24 }}>
          Upgrade to <strong style={{ color }}>{required.toUpperCase()}</strong> to unlock this feature.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, textAlign: "left" }}>
          {perks.map(p => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color, fontSize: 12, flexShrink: 0 }}>✓</span>
              <span style={{ fontFamily: C.sans, fontSize: 13, color: C.text2 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: C.display, fontSize: 26, color, marginBottom: 4 }}>{PLAN_PRICE[required]}</div>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 20 }}>No contracts · Cancel anytime</div>
        <button style={{ ...btnGold, width: "100%", background: color, color: required === "elite" ? "#000" : "#fff", fontSize: 14, padding: "12px 0" }}
          onClick={() => alert("Payment integration coming soon — contact support@pesapips.com to upgrade")}>
          Upgrade to {required.charAt(0).toUpperCase() + required.slice(1)} →
        </button>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 12 }}>
          Current plan: {(userPlan || "free").toUpperCase()}
        </div>
      </div>
    </div>
  )
}

// SIGNAL RUN LIMITER (free: 5/day)
function getSignalRunsToday() {
  try {
    const data = JSON.parse(localStorage.getItem("pp_signal_runs") || "{}")
    const today = new Date().toDateString()
    if (data.date !== today) return 0
    return data.count || 0
  } catch { return 0 }
}

function incrementSignalRuns() {
  try {
    const today = new Date().toDateString()
    const data  = JSON.parse(localStorage.getItem("pp_signal_runs") || "{}")
    const count = data.date === today ? (data.count || 0) + 1 : 1
    localStorage.setItem("pp_signal_runs", JSON.stringify({ date: today, count }))
    return count
  } catch { return 1 }
}

function Badge({ label, color, dim }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 20, fontFamily: C.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: dim || "rgba(255,255,255,0.05)", color: color || C.text3, border: `1px solid ${color || C.text3}30` }}>
      {label}
    </span>
  )
}

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: C.surface2, border: `1px solid ${C.border2}`,
  borderRadius: 8, color: C.text,
  fontFamily: C.sans, fontSize: 14, outline: "none",
  transition: "border-color 0.2s",
}

const btnGold = {
  padding: "11px 22px", background: C.gold, color: "#0d0f14",
  border: "none", borderRadius: 8, fontFamily: C.sans,
  fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s",
}

const btnOutline = {
  padding: "11px 22px", background: "transparent",
  border: `1px solid ${C.border2}`, color: C.text2,
  borderRadius: 8, fontFamily: C.sans, fontWeight: 600,
  fontSize: 14, cursor: "pointer", transition: "all 0.2s",
}

// TRADING SESSIONS
const SESSIONS = [
  { name: "Sydney",   open: 21, close: 6,  tz: "Australia/Sydney",  color: "#5b9cf6" },
  { name: "Tokyo",    open: 0,  close: 9,  tz: "Asia/Tokyo",        color: "#a78bfa" },
  { name: "London",   open: 7,  close: 16, tz: "Europe/London",     color: "#3dd68c" },
  { name: "New York", open: 12, close: 21, tz: "America/New_York",  color: "#f06b6b" },
]

function getActiveSession(utcHour, utcDay) {
  // Forex market closed: Saturday all day + Sunday before 21:00 UTC (Sydney open)
  const isWeekend = utcDay === 6 || (utcDay === 0 && utcHour < 21)
  if (isWeekend) return []
  const active = []
  for (const s of SESSIONS) {
    const isOpen = s.open < s.close
      ? utcHour >= s.open && utcHour < s.close
      : utcHour >= s.open || utcHour < s.close
    if (isOpen) active.push(s)
  }
  return active
}

function TopBar({ collapsed, setCollapsed, active, NAV, token, showMail, setShowMail, unreadMail }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const utcHour = now.getUTCHours()
  const utcDay  = now.getUTCDay()  // 0=Sun,6=Sat
  const isMarketClosed = utcDay === 6 || (utcDay === 0 && utcHour < 21)
  const activeSessions = getActiveSession(utcHour, utcDay)

  const fmt = (date, tz) => date.toLocaleTimeString("en-KE", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  })

  const fmtDate = (date, tz) => date.toLocaleDateString("en-KE", {
    timeZone: tz, weekday: "short", day: "numeric", month: "short",
  })

  const nairobiTime = fmt(now, "Africa/Nairobi")
  const utcTime     = fmt(now, "UTC")
  const londonTime  = fmt(now, "Europe/London")
  const tokyoTime   = fmt(now, "Asia/Tokyo")
  const nyTime      = fmt(now, "America/New_York")

  // Notifications + Mail state
  const [notifications, setNotifications] = useState([])
  const [unreadNotifs,  setUnreadNotifs]  = useState(0)
  const [showNotifs,    setShowNotifs]    = useState(false)

  useEffect(() => {
    if (!token) return
    const fetchCounts = () => {
      api.get("/notifications/unread-count")
        .then(r => { setUnreadNotifs(r.data.notifications) })
        .catch(() => {})
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 30000)
    return () => clearInterval(id)
  }, [token])

  useEffect(() => {
    if (!showNotifs || !token) return
    api.get("/notifications/").then(r => setNotifications(r.data)).catch(() => {})
  }, [showNotifs, token])

  const markNotifRead = (id) => {
    api.patch("/notifications/" + id + "/read").catch(() => {})
    setNotifications(p => p.map(n => n.id === id ? {...n, read: true} : n))
    setUnreadNotifs(p => Math.max(0, p - 1))
  }

  const markAllNotifsRead = () => {
    api.patch("/notifications/read-all").catch(() => {})
    setNotifications(p => p.map(n => ({...n, read: true})))
    setUnreadNotifs(0)
  }

  return (
    <div style={{ height: 48, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>

      {/* Left — hamburger + page name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", width: 200, flexShrink: 0 }}>
        <button onClick={() => setCollapsed(p => !p)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 17, padding: 4, transition: "color 0.15s", lineHeight: 1 }}
          onMouseEnter={e => e.target.style.color = C.gold}
          onMouseLeave={e => e.target.style.color = C.text3}
        >☰</button>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
          {NAV.find(n => n.id === active)?.label?.toUpperCase() || active.toUpperCase()}
        </span>
      </div>

      {/* Center — clocks + sessions */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>

        {/* Nairobi — primary */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.gold, letterSpacing: "0.05em", lineHeight: 1 }}>{nairobiTime}</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2 }}>NAIROBI · EAT</div>
        </div>

        {/* UTC */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text2, letterSpacing: "0.04em", lineHeight: 1 }}>{utcTime}</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2 }}>UTC</div>
        </div>

        {/* London */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text2, letterSpacing: "0.04em", lineHeight: 1 }}>{londonTime}</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2 }}>LONDON · GMT</div>
        </div>

        {/* Tokyo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text2, letterSpacing: "0.04em", lineHeight: 1 }}>{tokyoTime}</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2 }}>TOKYO · JST</div>
        </div>

        {/* New York */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text2, letterSpacing: "0.04em", lineHeight: 1 }}>{nyTime}</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2 }}>NEW YORK · EST</div>
        </div>

        {/* MT5 server time placeholder */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text3, letterSpacing: "0.04em", lineHeight: 1 }}>--:--:--</div>
          <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginTop: 2, opacity: 0.5 }}>BROKER · MT5</div>
        </div>

        {/* Active sessions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
          <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginRight: 4 }}>SESSION:</span>
          {isMarketClosed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 4, background: "#f06b6b15", border: "1px solid #f06b6b40" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f06b6b" }} />
              <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: "#f06b6b" }}>MARKET CLOSED</span>
            </div>
          ) : activeSessions.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 4, background: `${C.text3}10`, border: `1px solid ${C.text3}20` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.text3 }} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>CLOSED</span>
            </div>
          ) : activeSessions.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: s.color }}>{s.name.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — icons + live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", flexShrink: 0 }}>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setShowNotifs(p => !p); setShowMail(false) }} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px 8px",
            color: showNotifs ? C.gold : C.text3, fontSize: 16, borderRadius: 6,
            transition: "color 0.2s",
          }}>
            🔔
            {unreadNotifs > 0 && (
              <div style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16,
                background: C.red, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: C.mono, fontSize: 9, color: "#fff", fontWeight: 700 }}>
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </div>
            )}
          </button>
          {showNotifs && (
            <div style={{ position: "absolute", top: 40, right: 0, width: 320, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 12, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em" }}>NOTIFICATIONS</span>
                {unreadNotifs > 0 && <button onClick={markAllNotifsRead} style={{ background: "none", border: "none", fontFamily: C.mono, fontSize: 9, color: C.text3, cursor: "pointer" }}>Mark all read</button>}
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No notifications yet</div>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => markNotifRead(n.id)} style={{
                    padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                    background: n.read ? "transparent" : "rgba(212,168,67,0.04)",
                    cursor: "pointer", transition: "background 0.15s",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {n.type === "trade" ? "📈" : n.type === "mt5" ? "🔌" : n.type === "signal" ? "📡" : n.type === "system" ? "⚙" : "ℹ"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: n.read ? 400 : 600, color: C.text, marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3, lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 4 }}>{new Date(n.created_at).toLocaleString("en-KE")}</div>
                      </div>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mail */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setShowMail(p => !p); setShowNotifs(false) }} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px 8px",
            color: showMail ? C.gold : C.text3, fontSize: 16, borderRadius: 6,
            transition: "color 0.2s",
          }}>
            ✉️
            {unreadMail > 0 && (
              <div style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16,
                background: C.blue, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: C.mono, fontSize: 9, color: "#fff", fontWeight: 700 }}>
                {unreadMail > 9 ? "9+" : unreadMail}
              </div>
            )}
          </button>
        </div>

        {/* Live badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 20 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.green }}>PESAPIPS LIVE</span>
        </div>
      </div>
    </div>
  )
}

// PRICE TICKER
const TICKER_SYMBOLS = [
  { s: "XAU/USD", base: 2341.20,  vol: 0.0003 },
  { s: "XAG/USD", base: 74.50,    vol: 0.0004 },
  { s: "EUR/USD", base: 1.1470,   vol: 0.0001 },
  { s: "GBP/USD", base: 1.3270,   vol: 0.0001 },
  { s: "USD/JPY", base: 149.82,   vol: 0.0001 },
  { s: "BTC/USD", base: 70800.0,  vol: 0.0008 },
  { s: "ETH/USD", base: 2190.0,   vol: 0.0005 },
  { s: "USD/CHF", base: 0.7926,   vol: 0.0001 },
  { s: "AUD/USD", base: 0.7037,   vol: 0.0001 },
  { s: "WTI OIL", base: 96.50,    vol: 0.0003 },
  { s: "NASDAQ",  base: 22150.0,  vol: 0.0002 },
  { s: "DOW",     base: 46223.0,  vol: 0.0002 },
  { s: "S&P 500", base: 6624.0,   vol: 0.0002 },
  { s: "DXY",     base: 100.18,   vol: 0.0001 },
  { s: "USD/KES", base: 129.50,   vol: 0.0001 },
]

function fmt(s, p) {
  if (["BTC/USD","NASDAQ","S&P 500","DOW","XAU/USD","ETH/USD","WTI OIL","USD/KES"].includes(s)) return p.toFixed(2)
  if (["XAG/USD","DXY","USD/JPY"].includes(s)) return p.toFixed(3)
  return p.toFixed(4)
}

// Map ticker label → market watch symbol
const TICKER_TO_SYMBOL = {
  "XAU/USD": "XAUUSD", "XAG/USD": "XAGUSD",
  "EUR/USD": "EURUSD", "GBP/USD": "GBPUSD",
  "USD/JPY": "USDJPY", "BTC/USD": "BTCUSD",
  "ETH/USD": "ETHUSD", "USD/CHF": "USDCHF",
  "AUD/USD": "AUDUSD", "WTI OIL": "OIL",
  "NASDAQ":  "NASDAQ", "DOW":     "DOW",
  "S&P 500": "SPX",    "DXY":     "DXY",
  "USD/KES": "USDKES",
}

function TickerBar() {
  const [prices, setPrices] = useState(() => {
    // Start with base prices immediately — no blank ticker on load
    const m = {}
    TICKER_SYMBOLS.forEach(t => { m[t.s] = { price: t.base, base: t.base, vol: t.vol, chg: 0 } })
    return m
  })
  const [ready, setReady] = useState(false)
  const animRef = useRef(null)

  const seedFromWatch = async (force = false) => {
    try {
      const res = await api.get(`/market/watch${force ? "?force=true" : ""}`)
      setPrices(prev => {
        const next = { ...prev }
        TICKER_SYMBOLS.forEach(t => {
          const sym   = TICKER_TO_SYMBOL[t.s]
          const asset = res.data.assets.find(a => a.symbol === sym)
          if (asset?.price > 0) {
            next[t.s] = { price: asset.price, base: asset.price, vol: t.vol, chg: asset.change_pct || 0 }
          }
        })
        return next
      })
      setReady(true)
    } catch {
      setReady(true)
    }
  }

  useEffect(() => {
    // Single fetch on mount only — no auto-refresh
    seedFromWatch(true)
    return () => {}
  }, [])

  // No fake animation — prices come from real API only

  const items = ready ? Object.entries(prices) : []

  return (
    <div style={{ background: C.surface2, borderBottom: `1px solid ${C.border}`, height: 34, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, background: `linear-gradient(90deg,${C.surface2},transparent)`, zIndex: 2 }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 40, background: `linear-gradient(270deg,${C.surface2},transparent)`, zIndex: 2 }} />
      <div style={{ display: "flex", animation: "ticker 35s linear infinite", whiteSpace: "nowrap", alignItems: "center" }}>
        {[...items, ...items].map(([sym, d], i) => {
          const chg = d.chg !== undefined ? d.chg : ((d.price - d.base) / d.base) * 100
          const up  = chg >= 0
          return (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 22px", borderRight: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{sym}</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.text }}>{fmt(sym, d.price)}</span>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: up ? C.green : C.red }}>{up ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// CANDLE CHART
function CandleChart({ symbol, onSymbolChange }) {
  const canvasRef   = useRef(null)
  const [candles, setCandles]       = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [timeframe, setTimeframe]   = useState("M5")
  const [loading, setLoading]       = useState(true)
  const [source, setSource]         = useState("")
  const prevSymbol = useRef(symbol)

  const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1"]

  const fetchCandles = async (sym, tf) => {
    setLoading(true)
    try {
      // Try MT5 first for real broker data
      let res = null
      try {
        res = await api.get(`/trading/candles/${sym}?timeframe=${tf}&periods=80`)
        if (!res.data?.candles?.length) res = null
      } catch {}
      // Fall back to Yahoo if MT5 not available
      if (!res) {
        res = await api.get(`/market/candles/${sym}?timeframe=${tf}&periods=80`)
      }
      setCandles(res.data.candles || [])
      setSource(res.data.source || "yahoo")
      if (res.data.candles?.length > 0) {
        setCurrentPrice(res.data.candles[res.data.candles.length - 1].close)
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchCandles(symbol, timeframe)
    const id = setInterval(() => fetchCandles(symbol, timeframe), 30000)
    return () => clearInterval(id)
  }, [symbol, timeframe])

  useEffect(() => {
    if (!candles.length || !canvasRef.current || loading) return
    const canvas  = canvasRef.current
    const dpr     = window.devicePixelRatio || 1
    const W       = canvas.offsetWidth
    const H       = canvas.offsetHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    const ctx     = canvas.getContext("2d")
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const pad = { top: 16, bottom: 28, left: 8, right: 72 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom

    // Price range
    const highs = candles.map(c => c.high)
    const lows  = candles.map(c => c.low)
    const minP  = Math.min(...lows)
    const maxP  = Math.max(...highs)
    const pad5  = (maxP - minP) * 0.05
    const lo    = minP - pad5
    const hi    = maxP + pad5
    const range = hi - lo || 1

    const toY = p => pad.top + chartH - ((p - lo) / range) * chartH
    const candleW = Math.max(2, Math.floor((chartW / candles.length) * 0.7))

    // Background
    ctx.fillStyle = "#1a1f2e"
    ctx.fillRect(0, 0, W, H)

    // Grid lines + price labels
    const gridCount = 5
    for (let i = 0; i <= gridCount; i++) {
      const price = lo + (range / gridCount) * i
      const y     = toY(price)
      ctx.strokeStyle = "rgba(255,255,255,0.04)"
      ctx.lineWidth   = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle   = "#5a6070"
      ctx.font        = `9px 'DM Mono', monospace`
      ctx.textAlign   = "left"
      ctx.fillText(price.toFixed(price > 100 ? 2 : 4), W - pad.right + 6, y + 3)
    }

    // Candles
    candles.forEach((c, i) => {
      const x   = pad.left + (i / candles.length) * chartW + (chartW / candles.length) / 2
      const up  = c.close >= c.open
      const col = up ? "#3dd68c" : "#f06b6b"

      // Wick
      ctx.strokeStyle = col
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(x, toY(c.high))
      ctx.lineTo(x, toY(c.low))
      ctx.stroke()

      // Body
      const bodyTop = toY(Math.max(c.open, c.close))
      const bodyH   = Math.max(1.5, Math.abs(toY(c.open) - toY(c.close)))
      ctx.fillStyle   = col
      ctx.globalAlpha = up ? 0.9 : 0.85
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
      ctx.globalAlpha = 1
    })

    // Current price line
    if (currentPrice) {
      const y = toY(currentPrice)
      ctx.strokeStyle = "#d4a843"
      ctx.lineWidth   = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
      ctx.setLineDash([])

      // Price label box
      const label    = currentPrice.toFixed(currentPrice > 100 ? 2 : 4)
      const boxW     = pad.right - 4
      const boxH     = 16
      ctx.fillStyle  = "#d4a843"
      ctx.fillRect(W - pad.right + 1, y - boxH / 2, boxW, boxH)
      ctx.fillStyle  = "#000"
      ctx.font       = `bold 9px 'DM Mono', monospace`
      ctx.textAlign  = "center"
      ctx.fillText(label, W - pad.right + 1 + boxW / 2, y + 3)
    }

    // X axis time labels
    const step = Math.max(1, Math.floor(candles.length / 6))
    candles.forEach((c, i) => {
      if (i % step !== 0) return
      const x = pad.left + (i / candles.length) * chartW + (chartW / candles.length) / 2
      const t = new Date(c.time)
      const label = timeframe === "D1"
        ? `${t.getMonth()+1}/${t.getDate()}`
        : `${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`
      ctx.fillStyle  = "#5a6070"
      ctx.font       = `9px 'DM Mono', monospace`
      ctx.textAlign  = "center"
      ctx.fillText(label, x, H - 8)
    })

  }, [candles, currentPrice, loading])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 280 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.text }}>{symbol}</span>
          <span style={{ fontFamily: C.mono, fontSize: 9, padding: "2px 7px", borderRadius: 4, background: C.blueDim, color: C.blue, border: `1px solid ${C.blue}30` }}>{timeframe}</span>
          <span style={{ fontFamily: C.mono, fontSize: 9, padding: "2px 7px", borderRadius: 4, background: C.greenDim, color: C.green, border: `1px solid ${C.green}30` }}>
            {loading ? "LOADING" : "LIVE"}
          </span>
          {source && <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3 }}>{source}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {currentPrice && (
            <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.gold }}>
              {currentPrice.toFixed(currentPrice > 100 ? 2 : 4)}
            </span>
          )}
        </div>
      </div>

      {/* Timeframe selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexShrink: 0 }}>
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)} style={{
            padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer",
            fontFamily: C.mono, fontSize: 10, letterSpacing: "0.05em",
            background: timeframe === tf ? C.gold : C.surface2,
            color: timeframe === tf ? "#000" : C.text3,
            fontWeight: timeframe === tf ? 700 : 400,
            transition: "all 0.15s",
          }}>{tf}</button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1f2e", borderRadius: 8, zIndex: 2 }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>Loading {symbol} {timeframe}...</span>
          </div>
        )}
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", borderRadius: 8 }} />
      </div>
    </div>
  )
}

// MARKET WATCH STRIP
function MarketWatchStrip({ onSelectAsset, selectedAsset }) {
  const [assets, setAssets]   = useState([])
  const [signals, setSignals] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchWatch = async () => {
    try {
      // Try MT5 first for real broker data
      let assets = []
      try {
        const mt5Res = await api.get("/trading/watch")
        if(mt5Res.data?.assets?.length > 0) {
          assets = mt5Res.data.assets.map(a => ({
            symbol: a.symbol,
            price: a.bid,
            change_pct: a.change_pct,
            change_abs: a.change,
            digits: a.digits,
          }))
        }
      } catch {}
      // Fall back to Yahoo if MT5 not available
      if(assets.length === 0) {
        const res = await api.get("/market/watch?force=true")
        assets = res.data.assets
      }
      setAssets(assets)
      setLastUpdate(new Date())
    } catch {}
    finally { setLoading(false) }
  }

  const fetchSignals = async () => {
    try {
      const res = await api.get("/market/scan")
      const map = {}
      res.data.assets.forEach(a => { map[a.symbol] = { signal: a.signal, confidence: a.confidence } })
      setSignals(map)
    } catch {}
  }

  useEffect(() => {
    fetchWatch()
    fetchSignals()
    const watchId   = setInterval(fetchWatch,   10000)
    const signalId  = setInterval(fetchSignals, 30000)
    return () => { clearInterval(watchId); clearInterval(signalId) }
  }, [])

  const sigColor = s => s === "BUY" ? C.green : s === "SELL" ? C.red : C.text3
  const sigDim   = s => s === "BUY" ? C.greenDim : s === "SELL" ? C.redDim : "rgba(90,96,112,0.08)"

  const Sparkline = ({ data, up }) => {
    if (!data || data.length < 2) return (
      <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>no data</div>
      </div>
    )
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 0.0001
    const W = 100, H = 36
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 4) - 2
      return `${x},${y}`
    }).join(" ")
    const color = up ? C.green : C.red
    return (
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <circle cx={data.map((_,i)=>(i/(data.length-1))*W).at(-1)}
          cy={H - ((data.at(-1) - min) / range) * (H-4) - 2}
          r="2" fill={color} opacity="0.9" />
      </svg>
    )
  }

  // Split into rows of 4
  const rows = []
  for (let i = 0; i < assets.length; i += 4) {
    rows.push(assets.slice(i, i + 4))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>MARKET WATCH</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>yahoo finance · live</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdate && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>updated {lastUpdate.toLocaleTimeString()}</span>}
          <button onClick={() => { fetchWatch(); fetchSignals() }}
            style={{ background: "none", border: "none", fontFamily: C.mono, fontSize: 9, color: C.text3, cursor: "pointer", letterSpacing: "0.08em" }}
            onMouseEnter={e => e.target.style.color = C.gold}
            onMouseLeave={e => e.target.style.color = C.text3}
          >↻ REFRESH</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[...Array(16)].map((_,i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>loading...</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {row.map(a => {
                const isSelected = selectedAsset === a.symbol
                const up         = a.change_pct >= 0
                const sig        = signals[a.symbol] || { signal: "HOLD", confidence: 0 }
                const sColor     = sigColor(sig.signal)
                const decimals   = a.decimals || 4

                return (
                  <div key={a.symbol}
                    onClick={() => onSelectAsset(a.symbol)}
                    style={{
                      background: isSelected ? "rgba(212,168,67,0.07)" : C.surface,
                      border: `1px solid ${isSelected ? "rgba(212,168,67,0.45)" : C.border}`,
                      borderRadius: 10, padding: "12px 14px",
                      cursor: "pointer", transition: "all 0.15s",
                      position: "relative", overflow: "hidden",
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(212,168,67,0.25)" }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border }}
                  >
                    {/* Signal accent bar */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: sColor, opacity: sig.signal === "HOLD" ? 0.2 : 0.8 }} />

                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.text }}>{a.symbol}</div>
                        <div style={{ fontFamily: C.sans, fontSize: 10, color: C.text3, marginTop: 1 }}>{a.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: up ? C.green : C.red }}>
                          {a.price > 0 ? a.price.toFixed(decimals) : "—"}
                        </div>
                        <div style={{ fontFamily: C.mono, fontSize: 10, color: up ? C.green : C.red }}>
                          {up ? "▲" : "▼"}{Math.abs(a.change_pct).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div style={{ margin: "6px -2px" }}>
                      <Sparkline data={a.sparkline} up={up} />
                    </div>

                    {/* Footer row: signal + abs change */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: sColor, opacity: sig.signal === "HOLD" ? 0.3 : 1 }} />
                        <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: sColor }}>{sig.signal}</span>
                        {sig.confidence > 0 && (
                          <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3 }}>{(sig.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      <span style={{ fontFamily: C.mono, fontSize: 9, color: up ? C.green : C.red }}>
                        {up ? "+" : ""}{a.change_abs?.toFixed(decimals) || ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ECONOMIC CALENDAR
const EVENT_INFO = {
  "Current Account":    { desc: "Measures the difference in value of imported and exported goods, services, and transfers.", impact: "Surplus = bullish for currency, deficit = bearish." },
  "Trade Balance":      { desc: "Difference between exports and imports of goods.", impact: "Surplus strengthens the currency." },
  "CPI":                { desc: "Consumer Price Index — measures change in price of goods and services.", impact: "High CPI = inflation pressure = hawkish central bank = currency strengthens." },
  "Core CPI":           { desc: "CPI excluding food and energy — preferred inflation gauge.", impact: "Most watched inflation metric. Beats = currency bullish." },
  "PPI":                { desc: "Producer Price Index — measures inflation at wholesale level.", impact: "Leading indicator for CPI. Hot PPI = USD bullish." },
  "NFP":                { desc: "Non-Farm Payrolls — new jobs added in the US economy.", impact: "Biggest monthly USD mover. Strong NFP = USD bullish, gold bearish." },
  "Federal Funds Rate": { desc: "The interest rate the Fed charges banks for overnight lending.", impact: "Rate hike = USD bullish, gold bearish. Rate cut = opposite." },
  "FOMC":               { desc: "Federal Open Market Committee — sets US monetary policy.", impact: "Most important USD event. Tone can move all USD pairs and gold significantly." },
  "GDP":                { desc: "Gross Domestic Product — total economic output.", impact: "Strong GDP = currency bullish. Weak GDP = rate cut expectations." },
  "Retail Sales":       { desc: "Measures change in total value of sales at retail level.", impact: "Strong = economy healthy = currency bullish." },
  "Unemployment":       { desc: "Percentage of workforce that is jobless.", impact: "Low unemployment = strong economy = currency bullish." },
  "PMI":                { desc: "Purchasing Managers Index — survey of business activity. Above 50 = expansion.", impact: "Leading economic indicator. Rising above 50 = currency bullish." },
  "Interest Rate":      { desc: "Central bank benchmark interest rate decision.", impact: "Rate hike = currency bullish. Rate cut = bearish. Gold moves inversely to USD rates." },
  "BOC":                { desc: "Bank of Canada monetary policy statement or rate decision.", impact: "Affects CAD pairs directly." },
  "ECB":                { desc: "European Central Bank rate decision or press conference.", impact: "Affects EUR pairs. Hawkish tone = EUR bullish." },
  "BOJ":                { desc: "Bank of Japan policy decision.", impact: "Affects JPY pairs. Any tightening hint = JPY bullish." },
  "Crude Oil":          { desc: "Weekly change in barrels of crude oil held in US inventory.", impact: "Inventory build = bearish for oil. Draw = bullish for oil and CAD." },
  "default":            { desc: "Economic data release or central bank event.", impact: "Monitor actual vs forecast. Significant deviation can cause sharp price moves." },
}

function getEventInfo(eventName) {
  const key = Object.keys(EVENT_INFO).find(k =>
    k !== "default" && eventName.toLowerCase().includes(k.toLowerCase())
  )
  return EVENT_INFO[key] || EVENT_INFO["default"]
}

function EconomicCalendar() {
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState("all")
  const [alerts,   setAlerts]   = useState({})
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    api.get("/market/calendar?force=true")
      .then(r => setEvents(r.data.events))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleAlert  = key => setAlerts(p => ({ ...p, [key]: !p[key] }))
  const toggleExpand = key => setExpanded(p => ({ ...p, [key]: !p[key] }))
  const impactDot    = i => i === "high" ? C.red : i === "medium" ? "#e8a020" : C.text3

  const filtered = filter === "all" ? events : events.filter(e => e.impact === filter)
  const grouped  = {}
  filtered.forEach(ev => {
    const d = ev.date || "Today"
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(ev)
  })

  const beatsForecast = (actual, forecast) => {
    if (!actual || !forecast) return null
    const a = parseFloat(actual.replace(/[^0-9.-]/g, ""))
    const f = parseFloat(forecast.replace(/[^0-9.-]/g, ""))
    if (isNaN(a) || isNaN(f)) return null
    return a >= f ? "beat" : "miss"
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>ECONOMIC CALENDAR</div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>forexfactory.com</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all","high","medium","low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "3px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 9, background: filter === f ? C.gold : C.surface3, color: filter === f ? "#000" : C.text3, transition: "all 0.15s" }}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "24px 68px 48px 36px 1fr 90px 90px 90px", gap: 0, padding: "6px 10px", borderBottom: `1px solid ${C.border}`, marginBottom: 2 }}>
        {["","TIME","CCY","","EVENT","ACTUAL","FORECAST","PREVIOUS"].map((h, i) => (
          <div key={i} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", textAlign: i >= 5 ? "right" : "left" }}>{h}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0", fontFamily: C.mono, fontSize: 11, color: C.text3 }}>Loading calendar...</div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {Object.entries(grouped).map(([date, evs]) => (
            <div key={date}>
              <div style={{ padding: "7px 10px", fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: C.text2, background: C.surface2, borderBottom: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}` }}>{date}</div>
              {evs.map((ev, i) => {
                const key  = `${date}-${i}`
                const beat = beatsForecast(ev.actual, ev.forecast)
                const actualColor  = beat === "beat" ? C.green : beat === "miss" ? C.red : ev.actual ? C.text : C.text3
                const isAlerted    = alerts[key]
                const isExpanded   = expanded[key]
                const info         = getEventInfo(ev.event)
                return (
                  <div key={i}>
                    <div style={{ display: "grid", gridTemplateColumns: "24px 68px 48px 36px 1fr 90px 90px 90px", gap: 0, padding: "8px 10px", borderBottom: isExpanded ? "none" : `1px solid rgba(255,255,255,0.04)`, alignItems: "center", transition: "background 0.12s", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div onClick={e => { e.stopPropagation(); toggleAlert(key) }} style={{ cursor: "pointer", fontSize: 12, opacity: isAlerted ? 1 : 0.3, color: isAlerted ? C.gold : C.text3 }}>{isAlerted ? "🔔" : "🔕"}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{ev.time || ""}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.text }}>{ev.currency}</div>
                      <div><div style={{ width: 8, height: 8, borderRadius: "50%", background: impactDot(ev.impact), opacity: ev.impact === "low" ? 0.4 : 1 }} /></div>
                      <div onClick={() => toggleExpand(key)} style={{ fontFamily: C.sans, fontSize: 13, color: C.text, paddingRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                        {ev.event}<span style={{ fontSize: 9, color: C.text3, opacity: 0.6 }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: actualColor, textAlign: "right" }}>{ev.actual || "—"}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2, textAlign: "right" }}>{ev.forecast || "—"}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text3, textAlign: "right" }}>{ev.previous || "—"}</div>
                    </div>
                    {isExpanded && (
                      <div style={{ margin: "0 10px 10px 34px", padding: "14px 16px", background: "rgba(212,168,67,0.03)", border: `1px solid rgba(212,168,67,0.12)`, borderRadius: "0 0 8px 8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 6 }}>WHAT IS THIS?</div>
                            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.65 }}>{info.desc}</div>
                          </div>
                          <div>
                            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.12em", marginBottom: 6 }}>MARKET IMPACT</div>
                            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.65 }}>{info.impact}</div>
                          </div>
                        </div>
                        {(ev.actual && ev.forecast) && (
                          <div style={{ marginTop: 12, padding: "8px 12px", background: beat === "beat" ? C.greenDim : C.redDim, border: `1px solid ${beat === "beat" ? C.green : C.red}30`, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>{beat === "beat" ? "✓" : "✗"}</span>
                            <span style={{ fontFamily: C.sans, fontSize: 13, color: beat === "beat" ? C.green : C.red }}>
                              Actual {ev.actual} {beat === "beat" ? "beat" : "missed"} forecast of {ev.forecast} — {beat === "beat" ? "bullish" : "bearish"} for {ev.currency}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, alignItems: "center" }}>
        {[["high", C.red], ["medium", "#e8a020"], ["low", C.text3]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, opacity: label === "low" ? 0.4 : 1 }} />
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{label.toUpperCase()}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.green }}>GREEN = beat forecast</span>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.red }}>RED = missed forecast</span>
        </div>
      </div>
    </div>
  )
}

// MARKET NEWS
function MarketNews() {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState({})
  const [isLive,   setIsLive]   = useState(false)

  const load = () => {
    setLoading(true)
    api.get("/market/news?force=true")
      .then(r => { setArticles(r.data.articles); setIsLive(r.data.articles.some(a => a.is_live)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const catColor = cat => {
    if (!cat) return C.text3
    const c = cat.toLowerCase()
    if (c === "usd" || c === "equities") return C.blue
    if (c === "eur" || c === "gbp")      return C.green
    if (c === "commodities")             return C.gold
    if (c === "crypto")                  return "#a78bfa"
    return C.text2
  }
  const catDim = cat => {
    if (!cat) return "rgba(90,96,112,0.1)"
    const c = cat.toLowerCase()
    if (c === "usd" || c === "equities") return C.blueDim
    if (c === "eur" || c === "gbp")      return C.greenDim
    if (c === "commodities")             return C.goldDim
    if (c === "crypto")                  return "rgba(167,139,250,0.1)"
    return "rgba(154,160,176,0.08)"
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>MARKET NEWS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? C.green : C.gold }} />
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{isLive ? "live · rss feeds" : "sample · curated analysis"}</div>
          </div>
        </div>
        <button onClick={load} style={{ background: "none", border: "none", fontFamily: C.mono, fontSize: 10, color: C.text3, cursor: "pointer" }}
          onMouseEnter={e => e.target.style.color = C.gold}
          onMouseLeave={e => e.target.style.color = C.text3}
        >↻ REFRESH</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0", fontFamily: C.mono, fontSize: 11, color: C.text3 }}>Loading news...</div>
      ) : (
        <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
          {articles.map((art, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 10px", borderBottom: expanded[i] ? "none" : `1px solid rgba(255,255,255,0.04)`, transition: "background 0.12s", cursor: "pointer" }}
                onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}
                onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontFamily: C.mono, fontSize: 9, fontWeight: 700, background: catDim(art.category), color: catColor(art.category), border: `1px solid ${catColor(art.category)}30`, whiteSpace: "nowrap" }}>
                    {art.category || "MARKETS"}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>{art.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {art.time   && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{art.time}</span>}
                    {art.source && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, opacity: 0.6 }}>· {art.source}</span>}
                    {art.tags?.map(tag => (
                      <span key={tag} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, background: C.surface3, padding: "1px 6px", borderRadius: 3 }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: C.text3, paddingTop: 2, flexShrink: 0 }}>{expanded[i] ? "▲" : "▼"}</span>
              </div>
              {expanded[i] && art.analysis && (
                <div style={{ margin: "0 10px 10px 10px", padding: "14px 16px", background: "rgba(212,168,67,0.03)", border: `1px solid rgba(212,168,67,0.10)`, borderRadius: "0 0 8px 8px" }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.12em", marginBottom: 8 }}>ANALYSIS</div>
                  <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.7 }}>{art.analysis}</div>
                  {art.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>AFFECTS:</span>
                      {art.tags.map(tag => (
                        <span key={tag} style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: C.gold, background: C.goldDim, padding: "2px 8px", borderRadius: 4 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// STRATEGY UPLOAD
function StrategyUpload({ compact = false, fillHeight = false }) {
  const [json,    setJson]    = useState("")
  const [parsed,  setParsed]  = useState(null)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState("")

  const handleParse = () => {
    setError(""); setSuccess("")
    try { setParsed(JSON.parse(json)) }
    catch { setError("Invalid JSON. Check your strategy file format.") }
  }

  const handleApply = async () => {
    if (!parsed) return
    try {
      await api.post("/strategies/apply", {
        strategy_id: 1,
        asset: parsed.asset || "XAUUSD",
        timeframe: parsed.timeframe || "M5",
        custom_params: parsed,
      })
      setSuccess("Strategy uploaded and applied.")
    } catch (err) { setError(err.response?.data?.detail || "Failed to apply strategy.") }
  }

  const template = JSON.stringify({ ema_fast: 9, ema_mid: 21, ema_slow: 50, rsi_period: 14, rsi_buy: 30, rsi_sell: 70, macd_fast: 12, macd_slow: 26, macd_signal: 9, risk_per_trade: 1.0, sl_pips: 15, tp_pips: 30, asset: "XAUUSD", timeframe: "M5" }, null, 2)

  return (
    <div style={fillHeight ? { display: "flex", flexDirection: "column", height: "100%" } : {}}>
      {error   && <div style={{ background: C.redDim,   border: `1px solid ${C.red}30`,   borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: C.red,   fontFamily: C.sans, flexShrink: 0 }}>⚠ {error}</div>}
      {success && <div style={{ background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: C.green, fontFamily: C.sans, flexShrink: 0 }}>✓ {success}</div>}

      <textarea value={json} onChange={e => { setJson(e.target.value); setParsed(null) }}
        placeholder={template}
        style={{
          ...inputStyle,
          fontFamily: C.mono, fontSize: 11, lineHeight: 1.7,
          resize: fillHeight ? "none" : "vertical",
          flex: fillHeight ? 1 : "none",
          height: fillHeight ? "auto" : undefined,
          minHeight: compact ? 80 : 140,
        }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border2}
      />

      {parsed && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, flexShrink: 0 }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.green, letterSpacing: "0.1em", marginBottom: 6 }}>VALID JSON</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(parsed).slice(0, 6).map(([k, v]) => (
              <div key={k} style={{ fontFamily: C.mono, fontSize: 10, color: C.text2 }}>
                <span style={{ color: C.text3 }}>{k}:</span> <span style={{ color: C.text }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexShrink: 0 }}>
        <button onClick={handleParse} style={{ ...btnOutline, padding: "9px 16px", fontSize: 13 }}>Validate</button>
        {parsed && <button onClick={handleApply} style={{ ...btnGold, padding: "9px 16px", fontSize: 13 }}>Apply</button>}
        <button onClick={() => setJson(template)} style={{ ...btnOutline, padding: "9px 16px", fontSize: 13, marginLeft: "auto" }}>Template</button>
      </div>
    </div>
  )
}

// OVERVIEW


// ANNOUNCEMENT BANNER
function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [dismissed,     setDismissed]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("pp_dismissed_ann") || "[]") } catch { return [] }
  })

  useEffect(() => {
    api.get("/admin/announcements/active")
      .then(r => setAnnouncements(r.data || []))
      .catch(() => {})
  }, [])

  const dismiss = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem("pp_dismissed_ann", JSON.stringify(next))
  }

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  const TYPE_COLOR = {
    info:     { bg: "rgba(91,156,246,0.08)",  border: "rgba(91,156,246,0.2)",  text: "#5b9cf6"  },
    warning:  { bg: "rgba(240,147,79,0.08)",  border: "rgba(240,147,79,0.2)",  text: "#f0934f"  },
    success:  { bg: "rgba(61,214,140,0.08)",  border: "rgba(61,214,140,0.2)",  text: "#3dd68c"  },
    critical: { bg: "rgba(240,79,90,0.08)",   border: "rgba(240,79,90,0.2)",   text: "#f04f5a"  },
  }
  const TYPE_ICON = { info: "ℹ", warning: "⚠", success: "✓", critical: "🚨" }

  return (
    <div style={{ marginBottom: 16 }}>
      {visible.map(a => {
        const tc = TYPE_COLOR[a.type] || TYPE_COLOR.info
        return (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 10, marginBottom: 8 }}>
            <span style={{ color: tc.text, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[a.type] || "ℹ"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: tc.text, marginBottom: 2 }}>{a.title}</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{a.body}</div>
            </div>
            <button onClick={() => dismiss(a.id)}
              style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 14, flexShrink: 0, padding: "0 4px" }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.text3}>✕</button>
          </div>
        )
      })}
    </div>
  )
}


// SUPPORT TICKET FORM
function TicketForm() {
  const [form,   setForm]   = useState({ subject: "", body: "", type: "general", priority: "medium" })
  const [status, setStatus] = useState("")
  const [tickets,setTickets]= useState([])

  useEffect(() => {
    api.get("/dashboard/tickets/mine").then(r => setTickets(r.data || [])).catch(() => {})
  }, [status])

  const submit = async () => {
    if (!form.subject || !form.body) { setStatus("error:fill"); return }
    setStatus("sending")
    try {
      await api.post("/dashboard/tickets", form)
      setStatus("sent")
      setForm({ subject: "", body: "", type: "general", priority: "medium" })
      setTimeout(() => setStatus(""), 4000)
    } catch { setStatus("error:failed") }
  }

  const STATUS_COLOR = {
    open:        C.blue,
    in_progress: "#f0934f",
    resolved:    C.green,
    closed:      C.text3,
  }

  const iLabel = label => (
    <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>{label}</label>
  )

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* New ticket form */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px" }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>OPEN A SUPPORT TICKET</div>

        <div style={{ marginBottom: 14 }}>
          {iLabel("SUBJECT")}
          <input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))}
            placeholder="Brief description of your issue"
            style={{ ...inputStyle }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.border2} />
        </div>

        <div style={{ marginBottom: 14 }}>
          {iLabel("DESCRIPTION")}
          <textarea value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))}
            placeholder="Describe your issue in detail..." rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.border2} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            {iLabel("TYPE")}
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}
              style={{ ...inputStyle }}>
              <option value="general">General</option>
              <option value="bug">Bug report</option>
              <option value="billing">Billing</option>
              <option value="feature">Feature request</option>
            </select>
          </div>
          <div>
            {iLabel("PRIORITY")}
            <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}
              style={{ ...inputStyle }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {status === "sent" && (
          <div style={{ padding: "10px 14px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.green, marginBottom: 14 }}>
            ✓ Ticket submitted — you will receive a confirmation email shortly.
          </div>
        )}
        {status.startsWith("error") && (
          <div style={{ padding: "10px 14px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red, marginBottom: 14 }}>
            {status === "error:fill" ? "Please fill in subject and description." : "Failed to submit. Please try again."}
          </div>
        )}

        <button onClick={submit} disabled={status === "sending"}
          style={{ ...btnGold, width: "100%", opacity: status === "sending" ? 0.6 : 1 }}>
          {status === "sending" ? "Submitting..." : "Submit ticket"}
        </button>
      </div>

      {/* My tickets */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px" }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>MY TICKETS ({tickets.length})</div>
        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>🎫</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No tickets yet</div>
          </div>
        ) : tickets.map(t => (
          <div key={t.id} style={{ padding: "12px 14px", background: C.surface2, borderRadius: 8, marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text, flex: 1, marginRight: 8 }}>{t.subject}</div>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: STATUS_COLOR[t.status] || C.text3, flexShrink: 0 }}>{t.status.replace("_"," ").toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{t.type.toUpperCase()}</span>
              {t.note_count > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold }}>💬 {t.note_count} notes</span>}
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginLeft: "auto" }}>
                {t.created_at ? new Date(t.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// OVERVIEW LIVE POSITIONS WIDGET
function OverviewLivePositions() {
  const [trades,   setTrades]   = useState([])
  const [mt5Pos,   setMt5Pos]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjTrade, setAdjTrade] = useState(null)
  const [useMT5,   setUseMT5]   = useState(false)

  const load = () => {
    setLoading(true)
    api.get("/trading/positions")
      .then(r => {
        if(r.data?.positions?.length > 0) {
          setMt5Pos(r.data.positions)
          setUseMT5(true)
        } else {
          setMt5Pos([])
          setUseMT5(r.data?.agent_connected !== false)
        }
      })
      .catch(() => {
        api.get("/dashboard/trades?limit=100")
          .then(r => setTrades(r.data))
          .catch(() => {})
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  const mt5Trades = mt5Pos.map(p => ({
    id: p.ticket,
    symbol: p.symbol,      // for LivePositions display
    asset: p.symbol,       // for other components
    trade_type: p.type,
    lot: p.volume,         // LivePositions uses t.lot
    volume: p.volume,
    entry_price: p.open_price,
    current_price: p.current_price,
    profit: p.profit,
    swap: p.swap,
    sl: p.sl,
    tp: p.tp,
    status: "open",
    opened_at: new Date(p.open_time * 1000).toISOString(),
  }))

  return (
    <>
      {adjTrade && <AdjustTradeModal trade={adjTrade} onClose={() => setAdjTrade(null)} onSave={load} />}
      <LivePositions
        trades={useMT5 ? mt5Trades : trades}
        loading={loading}
        onAdjust={setAdjTrade}
        onRefresh={load}
        compact={true}
      />
    </>
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// AUTORUN BAR — sits below the live chart, controls the autorun engine
// ─────────────────────────────────────────────────────────────────────────────
function AutorunBar({ signal, activeStrat }) {
  const [running,      setRunning]      = useState(false)
  const [status,       setStatus]       = useState(null)
  const [toggling,     setToggling]     = useState(false)
  const [showLog,      setShowLog]      = useState(false)

  const fetchStatus = async () => {
    try {
      const r = await api.get("/trading/autorun/status")
      setRunning(r.data.running)
      setStatus(r.data)
    } catch {}
  }

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 10000)
    return () => clearInterval(id)
  }, [])

  const toggle = async () => {
    setToggling(true)
    try {
      if (running) {
        await api.post("/trading/autorun/stop")
        setRunning(false)
      } else {
        const r = await api.post("/trading/autorun/start")
        if (r.data.status === "error") {
          alert(r.data.message)
        } else {
          setRunning(true)
        }
      }
      await fetchStatus()
    } catch(e) {
      alert("Autorun error: " + (e.response?.data?.detail || e.message))
    }
    setToggling(false)
  }

  const sigColor = signal?.signal === "BUY"  ? C.green
                 : signal?.signal === "SELL" ? C.red : C.text3

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.surface2 }}>
      {/* Main bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", flexWrap: "wrap" }}>

        {/* Autorun toggle */}
        <button onClick={toggle} disabled={toggling}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: toggling ? "wait" : "pointer",
            background: running ? C.redDim : C.greenDim,
            border: `1px solid ${running ? C.red : C.green}50`,
            transition: "all 0.2s", opacity: toggling ? 0.6 : 1, flexShrink: 0,
          }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: running ? C.green : C.text3,
            boxShadow: running ? `0 0 6px ${C.green}` : "none",
            animation: running ? "pulse 1.5s infinite" : "none",
          }} />
          <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700,
                         color: running ? C.green : C.text2, letterSpacing: "0.08em" }}>
            {toggling ? "..." : running ? "AUTORUN ON" : "AUTORUN OFF"}
          </span>
        </button>

        {/* Signal summary */}
        {signal && (
          <>
            <div style={{ padding: "4px 12px", borderRadius: 6,
                          background: signal.signal !== "HOLD" ? `${sigColor}15` : C.surface3,
                          border: `1px solid ${sigColor}30`, flexShrink: 0 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: sigColor }}>
                {signal.signal}
              </span>
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, flexShrink: 0 }}>
              {signal.latest_price?.toLocaleString?.()}
            </div>
            {signal.signal !== "HOLD" && (
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.red }}>SL -{signal.sl?.toFixed?.(1)}</span>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.green }}>TP +{signal.tp?.toFixed?.(1)}</span>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
                  {Math.round((signal.confidence||0)*100)}% conf
                </span>
              </div>
            )}
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {signal.reason}
            </div>
          </>
        )}

        {/* Stats */}
        {status && (
          <div style={{ display: "flex", gap: 12, marginLeft: "auto", flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3 }}>TODAY</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text }}>{status.trades_today}/5</div>
            </div>
            <button onClick={() => setShowLog(v => !v)}
              style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`,
                       background: "transparent", color: C.text3, fontFamily: C.mono,
                       fontSize: 9, cursor: "pointer" }}>
              {showLog ? "Hide Log" : "Log"}
            </button>
          </div>
        )}
      </div>

      {/* Activity log */}
      {showLog && status?.log?.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px",
                      maxHeight: 120, overflowY: "auto", background: C.surface }}>
          {[...(status.log || [])].reverse().map((entry, i) => (
            <div key={i} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3,
                                  marginBottom: 3, lineHeight: 1.4 }}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE SIGNAL OVERLAY — candlestick chart + signal markers + confidence
// ─────────────────────────────────────────────────────────────────────────────
function SignalOverlay({ activeStrat, selectedAsset }) {
  const chartRef      = useRef(null)
  const chartObj      = useRef(null)
  const candleSeries  = useRef(null)
  const markerTimeout = useRef(null)
  const [signal,      setSignal]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [chartReady,  setChartReady]  = useState(false)
  const [tf,          setTf]          = useState("M5")
  const [marketClosed, setMarketClosed] = useState(false)
  const [cachedAt,    setCachedAt]    = useState(null)

  const TF_OPTIONS = ["M1","M5","M15","M30","H1","H4"]
  const WATCHED_ASSETS = [
    { label: "XAU/USD", value: "XAUUSD" },
    { label: "XAG/USD", value: "XAGUSD" },
    { label: "EUR/USD", value: "EURUSD" },
    { label: "GBP/USD", value: "GBPUSD" },
    { label: "USD/JPY", value: "USDJPY" },
    { label: "BTC/USD", value: "BTCUSD" },
    { label: "ETH/USD", value: "ETHUSD" },
    { label: "USD/CHF", value: "USDCHF" },
    { label: "AUD/USD", value: "AUDUSD" },
    { label: "WTI OIL", value: "OIL"    },
    { label: "NASDAQ",  value: "NASDAQ" },
    { label: "DOW",     value: "DOW"    },
    { label: "S&P 500", value: "SPX"    },
    { label: "DXY",     value: "DXY"    },
    { label: "USD/KES", value: "USDKES" },
  ]
  const [chartAsset, setChartAsset] = useState("XAUUSD")

  // Load lightweight-charts dynamically
  useEffect(() => {
    if (window.LightweightCharts) { setChartReady(true); return }
    const script = document.createElement("script")
    script.src = "https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"
    script.onload = () => setChartReady(true)
    document.head.appendChild(script)
  }, [])

  // Init chart once script loaded
  useEffect(() => {
    if (!chartReady || !chartRef.current || chartObj.current) return
    const chart = window.LightweightCharts.createChart(chartRef.current, {
      width:  chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 400,
      layout: { background: { color: "transparent" }, textColor: C.text3 },
      grid:   { vertLines: { color: C.border }, horzLines: { color: C.border } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale:  true,
    })
    candleSeries.current = chart.addCandlestickSeries({
      upColor:   C.green,  downColor:  C.red,
      borderUpColor: C.green, borderDownColor: C.red,
      wickUpColor:   C.green, wickDownColor:   C.red,
    })
    chartObj.current = chart

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({
        width:  chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 400,
      })
    })
    ro.observe(chartRef.current)
    return () => { ro.disconnect(); chart.remove(); chartObj.current = null }
  }, [chartReady])

  // Fetch candles + signal
  const fetchData = async () => {
    if (!candleSeries.current) return
    setLoading(true)
    try {
      const asset    = chartAsset
      const timeframe = tf
      const periods  = 200

      // Fetch candles
      const candleRes = await api.get(`/market/candles/${asset}?timeframe=${timeframe}&periods=${periods}`)
      setMarketClosed(candleRes.data?.market_closed || false)
      if (candleRes.data?.cached_at) setCachedAt(new Date(candleRes.data.cached_at * 1000).toLocaleString('en-KE', { dateStyle:'short', timeStyle:'short' }))
      const candles   = (candleRes.data?.candles || []).map(c => ({
        time:  c.time,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }))
      if (candles.length > 0) {
        candleSeries.current.setData(candles)
        chartObj.current?.timeScale().fitContent()
      }

      // Fetch signal
      const params = activeStrat?.custom_params || {
        indicators: ["EMA","RSI","MACD"],
        ema_fast:9, ema_mid:21, ema_slow:50,
        rsi_period:14, rsi_buy:35, rsi_sell:65,
        macd_fast:12, macd_slow:26, macd_signal:9,
      }
      const sigRes = await api.post("/signal/run", { asset, timeframe, params })
      const sig    = sigRes.data
      setSignal(sig)
      setLastUpdate(new Date().toLocaleTimeString())

      // Place marker on latest candle
      if (sig.signal !== "HOLD" && candles.length > 0) {
        const lastCandle = candles[candles.length - 1]
        candleSeries.current.setMarkers([{
          time:     lastCandle.time,
          position: sig.signal === "BUY" ? "belowBar" : "aboveBar",
          color:    sig.signal === "BUY" ? C.green : C.red,
          shape:    sig.signal === "BUY" ? "arrowUp" : "arrowDown",
          text:     sig.signal + " " + Math.round(sig.confidence * 100) + "%",
          size:     2,
        }])
      } else {
        candleSeries.current.setMarkers([])
      }
    } catch(e) {
      console.error("SignalOverlay fetch error:", e)
    }
    setLoading(false)
  }

  // Fetch on mount, on strategy/asset/tf change, and every 30s
  useEffect(() => {
    if (!chartReady) return
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [chartReady, activeStrat?.id, chartAsset, tf])

  const sigColor = signal?.signal === "BUY" ? C.green
                 : signal?.signal === "SELL" ? C.red : C.text3
  const sigBg    = signal?.signal === "BUY" ? C.greenDim
                 : signal?.signal === "SELL" ? C.redDim : C.surface2

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? C.gold : C.green,
                        boxShadow: `0 0 6px ${loading ? C.gold : C.green}`, animation: loading ? "pulse 1s infinite" : "none" }} />
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text, fontWeight: 600, letterSpacing: "0.08em" }}>
            LIVE CHART — {chartAsset}
          </span>
          {activeStrat && (
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, padding: "2px 8px",
                           background: C.surface3, borderRadius: 4 }}>
              {activeStrat.custom_params?.strategy_name || "Strategy"}
            </span>
          )}
          {marketClosed && (
            <span style={{ fontFamily: C.mono, fontSize: 9, color: "#f06b6b", padding: "2px 10px",
                           background: "#f06b6b15", border: "1px solid #f06b6b40", borderRadius: 4 }}>
              ⏸ MARKET CLOSED {cachedAt ? `· last data ${cachedAt}` : "· cached data"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Asset dropdown */}
          <select
            value={chartAsset}
            onChange={e => setChartAsset(e.target.value)}
            style={{
              background: "#1f2330", border: "1px solid rgba(255,255,255,0.12)",
              color: "#d4a843", fontFamily: "'DM Mono','Courier New',monospace",
              fontSize: 10, borderRadius: 6, padding: "3px 8px",
              cursor: "pointer", outline: "none", fontWeight: 600,
            }}>
            {WATCHED_ASSETS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          {/* TF selector */}
          <div style={{ display: "flex", gap: 3 }}>
            {TF_OPTIONS.map(t => (
              <button key={t} onClick={() => setTf(t)}
                style={{ padding: "3px 7px", borderRadius: 4, border: "none", cursor: "pointer",
                         fontFamily: C.mono, fontSize: 9, fontWeight: 600,
                         background: (activeStrat?.custom_params?.timeframe || tf) === t ? C.gold : C.surface3,
                         color:      (activeStrat?.custom_params?.timeframe || tf) === t ? "#000" : C.text3 }}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                     background: "transparent", color: C.text3, fontFamily: C.mono, fontSize: 9,
                     cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "..." : "↺ Refresh"}
          </button>
          <button
            onClick={() => {
              const TF_TV = { M1:"1", M5:"5", M15:"15", M30:"30", H1:"60", H4:"240", D1:"D" }
              const tvInterval = TF_TV[tf] || "5"
              const sym = chartAsset || "XAUUSD"
              window.open(
                `https://www.tradingview.com/chart/?symbol=${sym}&interval=${tvInterval}&theme=dark`,
                "_blank"
              )
            }}
            title="Open full chart with indicators & drawing tools"
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.gold}50`,
                     background: C.goldDim, color: C.gold, fontFamily: C.mono, fontSize: 9,
                     cursor: "pointer", letterSpacing: "0.05em", fontWeight: 600 }}>
            ⛶ Full Screen
          </button>
          {lastUpdate && (
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
              {lastUpdate}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} style={{ width: "100%", flex: 1, minHeight: 400, background: "transparent" }} />

      {/* Autorun bar */}
      <AutorunBar signal={signal} activeStrat={activeStrat} />
    </div>
  )
}



// ── USER BLOG ─────────────────────────────────────────────────────────────────
function UserBlog({ user }) {
  const CATEGORIES = ["Strategy","Market Analysis","Education","Broker Review","Trade Journal","General"]
  const CAT_COLORS = {"Strategy":"#5b9cf6","Market Analysis":"#3dd68c","Education":"#d4a843","Broker Review":"#a78bfa","Trade Journal":"#f06b6b","General":"#9aa0b0"}
  const [tab,       setTab]      = useState("feed")
  const [posts,     setPosts]    = useState([])
  const [myPosts,   setMyPosts]  = useState([])
  const [loading,   setLoading]  = useState(false)
  const [form,      setForm]     = useState({ title:"", content:"", excerpt:"", category:"Education" })
  const [submitting,setSubmit]   = useState(false)
  const [success,   setSuccess]  = useState("")
  const [error,     setError]    = useState("")
  const [selected,  setSelected] = useState(null)

  const plan = user?.subscription_plan || "free"

  useEffect(() => {
    api.get("/blog/published?limit=12").then(r => setPosts(r.data.posts)).catch(()=>{})
    api.get("/blog/mine").then(r => setMyPosts(r.data)).catch(()=>{})
  }, [success])

  const handleSubmit = async () => {
    if (!form.title || form.title.length < 10) { setError("Title must be at least 10 characters"); return }
    if (!form.content || form.content.length < 200) { setError("Content must be at least 200 characters"); return }
    setSubmit(true); setError("")
    try {
      await api.post("/blog/submit", form)
      setSuccess("Post submitted for review! You will be notified once it is approved.")
      setForm({ title:"", content:"", excerpt:"", category:"Education" })
      setTab("mine")
    } catch(e) { setError(e.response?.data?.detail || "Submission failed") }
    setSubmit(false)
  }

  const statusColor = { pending:"#f5c842", published:"#3dd68c", rejected:"#f06b6b", draft:"#9aa0b0" }
  const statusIcon  = { pending:"⏳", published:"✅", rejected:"❌", draft:"📝" }

  return (
    <div>
      <SectionHeader title="Blog" sub="Read community articles and share your own trading experience." />

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:24, gap:0 }}>
        {[["feed","📰 Feed"],["write","✍️ Write"],["mine","📋 My Posts"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"11px 20px", background:"transparent", border:"none", borderBottom:tab===id?`2px solid ${C.gold}`:"2px solid transparent", fontFamily:C.sans, fontSize:13, fontWeight:tab===id?600:400, color:tab===id?C.gold:C.text3, cursor:"pointer" }}>{label}</button>
        ))}
        <a href="/blog" target="_blank" style={{ padding:"11px 20px", background:"transparent", border:"none", borderBottom:"2px solid transparent", fontFamily:C.mono, fontSize:10, color:C.text3, cursor:"pointer", marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          View public blog →
        </a>
      </div>

      {/* FEED TAB */}
      {tab === "feed" && (
        <div>
          {selected ? (
            <div>
              <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:C.gold, fontFamily:C.mono, fontSize:11, cursor:"pointer", marginBottom:20 }}>← Back to feed</button>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"28px 32px" }}>
                <span style={{ fontFamily:C.mono, fontSize:8, color:CAT_COLORS[selected.category]||C.text3, padding:"3px 8px", background:`${CAT_COLORS[selected.category]||C.text3}15`, borderRadius:4 }}>{selected.category?.toUpperCase()}</span>
                <h2 style={{ fontFamily:C.display, fontSize:24, color:C.text, margin:"12px 0 8px" }}>{selected.title}</h2>
                <div style={{ fontFamily:C.mono, fontSize:10, color:C.text3, marginBottom:24 }}>By {selected.author_name} · {selected.views} views</div>
                <div style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.85, whiteSpace:"pre-wrap" }}>{selected.content}</div>
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {posts.map(post=>(
                <div key={post.id} onClick={()=>{
                  setLoading(true)
                  api.get(`/blog/published/${post.slug}`).then(r=>{setSelected(r.data);setLoading(false)}).catch(()=>setLoading(false))
                }} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.transform="translateY(-2px)"}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)"}}>
                  <div style={{ marginBottom:8 }}>
                    <span style={{ fontFamily:C.mono, fontSize:8, color:CAT_COLORS[post.category]||C.text3, padding:"3px 8px", background:`${CAT_COLORS[post.category]||C.text3}15`, borderRadius:4 }}>{post.category?.toUpperCase()}</span>
                  </div>
                  <h3 style={{ fontFamily:C.display, fontSize:16, color:C.text, marginBottom:8, lineHeight:1.3 }}>{post.title}</h3>
                  <p style={{ fontFamily:C.sans, fontSize:12, color:C.text2, lineHeight:1.6, marginBottom:12 }}>{post.excerpt?.slice(0,100)}...</p>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.text3 }}>By {post.author_name}</span>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.text3 }}>{post.views} views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WRITE TAB */}
      {tab === "write" && (
        <div style={{ maxWidth:680 }}>
          {success && <div style={{ background:"rgba(61,214,140,0.08)", border:"1px solid rgba(61,214,140,0.2)", borderRadius:8, padding:"12px 16px", marginBottom:20, color:C.green, fontFamily:C.sans, fontSize:13 }}>✓ {success}</div>}
          {error   && <div style={{ background:"rgba(240,107,107,0.08)", border:"1px solid rgba(240,107,107,0.2)", borderRadius:8, padding:"12px 16px", marginBottom:20, color:C.red, fontFamily:C.sans, fontSize:13 }}>⚠ {error}</div>}

          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"24px 28px", marginBottom:16 }}>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", marginBottom:16 }}>SUBMISSION GUIDELINES</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Minimum 200 characters of content","No spam or promotional content without disclosure","Be honest — share real results and real experience","All posts are reviewed by admin before publishing",plan==="free"?"Free users: max 2 pending posts at a time":"Unlimited submissions on your plan"].map((g,i)=>(
                <div key={i} style={{ display:"flex", gap:8, fontFamily:C.sans, fontSize:12, color:C.text2 }}>
                  <span style={{ color:C.green }}>✓</span>{g}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", display:"block", marginBottom:6 }}>TITLE *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. My 3-month experience with the Inside Bar strategy" style={{ width:"100%", padding:"12px 14px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.sans, fontSize:14, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, marginTop:4 }}>{form.title.length} chars (min 10)</div>
            </div>

            <div>
              <label style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", display:"block", marginBottom:6 }}>CATEGORY</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ width:"100%", padding:"12px 14px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.sans, fontSize:14, outline:"none" }}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", display:"block", marginBottom:6 }}>EXCERPT (optional — auto-generated if blank)</label>
              <input value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} placeholder="One-line summary of your article..." style={{ width:"100%", padding:"12px 14px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.sans, fontSize:14, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
            </div>

            <div>
              <label style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", display:"block", marginBottom:6 }}>CONTENT * (supports ## headings, **bold**, - bullet points)</label>
              <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Write your article here. Use ## for headings, **bold** for emphasis, - for bullet points." rows={14} style={{ width:"100%", padding:"14px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.mono, fontSize:12, outline:"none", resize:"vertical", lineHeight:1.7 }}
                onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border2} />
              <div style={{ fontFamily:C.mono, fontSize:9, color:form.content.length<200?C.red:C.green, marginTop:4 }}>{form.content.length} chars (min 200)</div>
            </div>

            <button onClick={handleSubmit} disabled={submitting} style={{ padding:"13px", borderRadius:8, border:"none", background:submitting?C.surface2:C.gold, color:submitting?C.text3:"#000", fontFamily:C.sans, fontWeight:700, fontSize:14, cursor:submitting?"wait":"pointer" }}>
              {submitting ? "Submitting..." : "Submit for review →"}
            </button>
          </div>
        </div>
      )}

      {/* MY POSTS TAB */}
      {tab === "mine" && (
        <div>
          {myPosts.length === 0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center" }}>
              <div style={{ fontFamily:C.display, fontSize:20, color:C.text, marginBottom:8 }}>No posts yet</div>
              <p style={{ fontFamily:C.sans, fontSize:13, color:C.text2, marginBottom:20 }}>Switch to the Write tab to submit your first article.</p>
              <button onClick={()=>setTab("write")} style={{ padding:"10px 24px", borderRadius:8, border:`1px solid ${C.gold}40`, background:C.goldDim, color:C.gold, fontFamily:C.mono, fontSize:11, cursor:"pointer" }}>Start writing →</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {myPosts.map(post=>(
                <div key={post.id} style={{ background:C.surface, border:`1px solid ${statusColor[post.status]}30`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ fontSize:18, flexShrink:0 }}>{statusIcon[post.status]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:C.sans, fontSize:14, fontWeight:600, color:C.text, marginBottom:4 }}>{post.title}</div>
                    <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, marginBottom:post.admin_note?8:0 }}>{post.category} · {new Date(post.created_at).toLocaleDateString()}</div>
                    {post.admin_note && <div style={{ fontFamily:C.sans, fontSize:12, color:statusColor[post.status], background:`${statusColor[post.status]}10`, padding:"8px 12px", borderRadius:6 }}>Admin note: {post.admin_note}</div>}
                  </div>
                  <div style={{ padding:"4px 10px", borderRadius:6, background:`${statusColor[post.status]}15`, border:`1px solid ${statusColor[post.status]}30` }}>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:statusColor[post.status], fontWeight:700 }}>{post.status.toUpperCase()}</span>
                  </div>
                  {post.status === "published" && (
                    <a href={`/blog/${post.slug}`} target="_blank" style={{ fontFamily:C.mono, fontSize:9, color:C.gold, padding:"4px 10px", border:`1px solid ${C.gold}30`, borderRadius:6 }}>View →</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MARKET INTEL ─────────────────────────────────────────────────────────────
function MarketIntel({ user }) {
  const SYMBOLS   = ["XAUUSD","EURUSD","GBPUSD","USDJPY","GBPJPY","BTCUSD"]
  const TIMEFRAMES = ["M5","M15","H1","H4","D1"]
  const [symbol,    setSymbol]    = useState("XAUUSD")
  const [tf,        setTf]        = useState("H1")
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [btResult,  setBtResult]  = useState(null)
  const [btLoading, setBtLoading] = useState(false)
  const [btStrat,   setBtStrat]   = useState(null)
  const [executing, setExecuting] = useState(false)
  const [execResult,setExecResult]= useState("")

  const plan = user?.subscription_plan || "free"
  const tierOrder = { free:0, pro:1, elite:2, platinum:3 }
  const userTier  = tierOrder[plan] || 0

  const runAnalysis = async () => {
    setLoading(true); setError(""); setData(null); setBtResult(null); setExecResult("")
    try {
      const r = await api.post("/signal/market-intel", { symbol, timeframe: tf, periods: 500 })
      setData(r.data)
      if (r.data.top_strategies?.length) setBtStrat(r.data.top_strategies[0].strategy_id)
    } catch (e) { setError(e.response?.data?.detail || "Analysis failed") }
    setLoading(false)
  }

  const runBacktest = async () => {
    if (!btStrat || !data) return
    setBtLoading(true); setBtResult(null)
    try {
      const r = await api.post("/signal/backtest", { strategy_id: btStrat, symbol, timeframe: tf, periods: 500 })
      setBtResult(r.data)
    } catch (e) { setBtResult({ error: e.response?.data?.detail || "Backtest failed" }) }
    setBtLoading(false)
  }

  const executeSignal = async (stratId) => {
    setExecuting(true); setExecResult("")
    try {
      const r = await api.post("/signal/run", { strategy_id: stratId, symbol, timeframe: tf })
      const sig = r.data.signal
      if (sig === "BUY" || sig === "SELL") {
        await api.post("/trading/place", { symbol, side: sig, strategy_id: stratId })
        setExecResult(`✓ ${sig} order placed for ${symbol}`)
      } else {
        setExecResult("No signal to execute — market says HOLD right now")
      }
    } catch (e) { setExecResult("✗ " + (e.response?.data?.detail || "Execution failed")) }
    setExecuting(false)
  }

  const REGIME_GRADIENT = {
    TRENDING_UP:   "linear-gradient(135deg, rgba(61,214,140,0.08), transparent)",
    TRENDING_DOWN: "linear-gradient(135deg, rgba(240,107,107,0.08), transparent)",
    RANGING:       "linear-gradient(135deg, rgba(245,200,66,0.08), transparent)",
    VOLATILE:      "linear-gradient(135deg, rgba(167,139,250,0.08), transparent)",
    BREAKOUT:      "linear-gradient(135deg, rgba(91,156,246,0.08), transparent)",
  }

  return (
    <div>
      <SectionHeader title="Market Intel" sub="AI-powered market regime detection. Know the condition before you trade." />

      {/* Controls */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:8 }}>
          {SYMBOLS.map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${symbol===s?C.gold:C.border}`, background:symbol===s?C.goldDim:"transparent", color:symbol===s?C.gold:C.text3, fontFamily:C.mono, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${tf===t?C.blue:C.border}`, background:tf===t?"rgba(91,156,246,0.1)":"transparent", color:tf===t?C.blue:C.text3, fontFamily:C.mono, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}>{t}</button>
          ))}
        </div>
        <button onClick={runAnalysis} disabled={loading} style={{ padding:"9px 24px", borderRadius:8, border:"none", background:loading?C.surface2:C.gold, color:loading?C.text3:"#000", fontFamily:C.mono, fontSize:11, fontWeight:700, cursor:loading?"wait":"pointer", letterSpacing:"0.06em" }}>
          {loading ? "Analysing..." : "◈ Analyse Market"}
        </button>
      </div>

      {error && <div style={{ padding:"12px 16px", background:"rgba(240,107,107,0.08)", border:"1px solid rgba(240,107,107,0.2)", borderRadius:8, color:C.red, fontFamily:C.mono, fontSize:12, marginBottom:20 }}>{error}</div>}

      {!data && !loading && (
        <div style={{ padding:"60px 40px", textAlign:"center", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14 }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🧬</div>
          <div style={{ fontFamily:C.display, fontSize:22, color:C.text, marginBottom:8 }}>Market Intelligence Engine</div>
          <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, maxWidth:480, margin:"0 auto 24px", lineHeight:1.7 }}>
            Select a symbol and timeframe above, then click Analyse Market. The AI will classify the current market regime, score every strategy for suitability, and show you historical pattern matches.
          </p>
          <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
            {[["Regime Detection","Trending, Ranging, Volatile or Breakout"],["Strategy Scoring","Which of your strategies fits this market"],["Historical Match","How similar setups resolved in the past"],["One-Click Execute","Run the signal and place the trade"]].map(([t,d])=>(
              <div key={t} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 20px", maxWidth:200, textAlign:"left" }}>
                <div style={{ fontFamily:C.mono, fontSize:10, color:C.gold, marginBottom:6 }}>{t}</div>
                <div style={{ fontFamily:C.sans, fontSize:12, color:C.text2, lineHeight:1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Regime card */}
          <div style={{ background:REGIME_GRADIENT[data.regime]||C.surface, border:`2px solid ${data.regime_color}40`, borderRadius:16, padding:"28px 32px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:28, color:data.regime_color, filter:`drop-shadow(0 0 12px ${data.regime_color}80)` }}>{data.regime_icon}</span>
                  <div>
                    <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:4 }}>{symbol} · {tf} · MARKET REGIME</div>
                    <div style={{ fontFamily:C.display, fontSize:28, color:data.regime_color, lineHeight:1 }}>{data.regime_label}</div>
                  </div>
                </div>
                <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.7, maxWidth:600, marginBottom:12 }}>{data.regime_short}</p>
                <div style={{ padding:"10px 14px", background:`${data.regime_color}12`, border:`1px solid ${data.regime_color}30`, borderRadius:8, fontFamily:C.sans, fontSize:13, color:data.regime_color, maxWidth:560 }}>
                  💡 {data.regime_advice}
                </div>
              </div>
              {/* Confidence */}
              <div style={{ textAlign:"center", minWidth:100 }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", marginBottom:8 }}>CONFIDENCE</div>
                <div style={{ position:"relative", width:80, height:80, margin:"0 auto" }}>
                  <svg viewBox="0 0 80 80" style={{ transform:"rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={C.surface2} strokeWidth="6"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={data.regime_color} strokeWidth="6"
                      strokeDasharray={`${(data.confidence/100)*201} 201`} strokeLinecap="round"/>
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.mono, fontSize:16, fontWeight:700, color:data.regime_color }}>{data.confidence}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicator grid */}
          {data.indicators && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>TECHNICAL INDICATORS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
                {[
                  ["ADX", data.indicators.adx, data.indicators.adx>30?"Strong trend":data.indicators.adx>20?"Moderate":"Weak", data.indicators.adx>25?C.gold:C.text3],
                  ["DM+", data.indicators.dmp, "Bullish pressure", data.indicators.dmp>data.indicators.dmn?C.green:C.text3],
                  ["DM-", data.indicators.dmn, "Bearish pressure", data.indicators.dmn>data.indicators.dmp?C.red:C.text3],
                  ["RSI", data.indicators.rsi, data.indicators.rsi>70?"Overbought":data.indicators.rsi<30?"Oversold":"Neutral", data.indicators.rsi>70?C.red:data.indicators.rsi<30?C.green:C.text3],
                  ["ATR", data.indicators.atr, `${data.indicators.atr_pct}% of price`, C.text2],
                  ["ATR/Avg", data.indicators.atr_vs_avg+"x", data.indicators.atr_vs_avg>1.3?"Expanding":"Contracting", data.indicators.atr_vs_avg>1.3?C.red:C.green],
                  ["200 EMA", data.indicators.ema200, data.structure?.above_200?"Price above":"Price below", data.structure?.above_200?C.green:C.red],
                  ["BB Width", data.indicators.bb_width+"%", data.indicators.bb_width<1.5?"Squeeze":"Normal", data.indicators.bb_width<1.5?C.gold:C.text3],
                ].map(([label,val,desc,color])=>(
                  <div key={label} style={{ background:C.surface2, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontFamily:C.mono, fontSize:8, color:C.text3, marginBottom:4 }}>{label}</div>
                    <div style={{ fontFamily:C.mono, fontSize:14, fontWeight:700, color, marginBottom:3 }}>{val}</div>
                    <div style={{ fontFamily:C.sans, fontSize:10, color:C.text3 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regime score breakdown */}
          {data.scores && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>REGIME SCORE BREAKDOWN</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {Object.entries(data.scores).sort((a,b)=>b[1]-a[1]).map(([regime,score])=>{
                  const maxScore = Math.max(...Object.values(data.scores))
                  const pct = maxScore > 0 ? score/maxScore*100 : 0
                  const colors = {TRENDING_UP:"#3dd68c",TRENDING_DOWN:"#f06b6b",RANGING:"#f5c842",VOLATILE:"#a78bfa",BREAKOUT:"#5b9cf6"}
                  const labels = {TRENDING_UP:"Trending Up",TRENDING_DOWN:"Trending Down",RANGING:"Ranging",VOLATILE:"High Volatility",BREAKOUT:"Breakout"}
                  return (
                    <div key={regime} style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:130, fontFamily:C.mono, fontSize:10, color:regime===data.regime?colors[regime]:C.text3, fontWeight:regime===data.regime?700:400 }}>{labels[regime]}</div>
                      <div style={{ flex:1, height:6, background:C.surface2, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:colors[regime], borderRadius:3, transition:"width 0.8s ease", opacity:regime===data.regime?1:0.4 }}/>
                      </div>
                      <div style={{ width:24, fontFamily:C.mono, fontSize:10, color:regime===data.regime?colors[regime]:C.text3, textAlign:"right" }}>{score}</div>
                      {regime===data.regime && <div style={{ fontFamily:C.mono, fontSize:8, color:colors[regime], padding:"2px 6px", background:`${colors[regime]}15`, borderRadius:3 }}>DETECTED</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Plain English Analysis */}
          {data.analysis && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>AI ANALYSIS — PLAIN ENGLISH</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {data.analysis.map((line,i)=>(
                  <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:C.goldDim, border:`1px solid ${C.gold}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.mono, fontSize:9, color:C.gold, flexShrink:0, marginTop:1 }}>{i+1}</div>
                    <p style={{ fontFamily:C.sans, fontSize:13, color:C.text2, lineHeight:1.7, margin:0 }}>{line}</p>
                  </div>
                ))}
              </div>
              {data.tier_limited && (
                <div style={{ marginTop:16, padding:"10px 14px", background:C.goldDim, border:`1px solid ${C.gold}30`, borderRadius:8, fontFamily:C.sans, fontSize:12, color:C.gold }}>
                  ⭐ {data.upgrade_msg}
                </div>
              )}
            </div>
          )}

          {/* Historical Similarity — Elite+ */}
          {data.similarity && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>HISTORICAL PATTERN MATCH</div>
              <p style={{ fontFamily:C.sans, fontSize:13, color:C.text2, marginBottom:16 }}>
                The engine found <strong style={{color:C.text}}>{data.similarity.cases}</strong> similar market setups in recent history (same ADX range, RSI level, EMA alignment).
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div style={{ background:"rgba(61,214,140,0.08)", border:"1px solid rgba(61,214,140,0.2)", borderRadius:10, padding:"16px 20px", textAlign:"center" }}>
                  <div style={{ fontFamily:C.mono, fontSize:28, fontWeight:700, color:C.green }}>{data.similarity.bull_pct}%</div>
                  <div style={{ fontFamily:C.sans, fontSize:12, color:C.text3, marginTop:4 }}>Resolved Upward</div>
                </div>
                <div style={{ background:"rgba(240,107,107,0.08)", border:"1px solid rgba(240,107,107,0.2)", borderRadius:10, padding:"16px 20px", textAlign:"center" }}>
                  <div style={{ fontFamily:C.mono, fontSize:28, fontWeight:700, color:C.red }}>{data.similarity.bear_pct}%</div>
                  <div style={{ fontFamily:C.sans, fontSize:12, color:C.text3, marginTop:4 }}>Resolved Downward</div>
                </div>
              </div>
              <div style={{ height:8, background:C.surface2, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${data.similarity.bull_pct}%`, background:`linear-gradient(90deg,${C.green},${C.gold})`, borderRadius:4, transition:"width 1s ease" }}/>
              </div>
            </div>
          )}

          {/* Strategy recommendations */}
          {data.top_strategies && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>STRATEGY FIT FOR THIS REGIME</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {data.top_strategies.filter(s=>s.name).map((s,i)=>(
                  <div key={s.strategy_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:i===0?`${s.fit_color}08`:C.surface2, border:`1px solid ${i===0?s.fit_color+"30":C.border}`, borderRadius:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:s.fit_color, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:600, color:s.can_use?C.text:C.text3 }}>{s.name}</div>
                      <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, marginTop:2 }}>{s.timeframe} · {(s.tier_required||"free").toUpperCase()}</div>
                    </div>
                    <div style={{ padding:"3px 10px", background:`${s.fit_color}15`, border:`1px solid ${s.fit_color}30`, borderRadius:6 }}>
                      <span style={{ fontFamily:C.mono, fontSize:10, fontWeight:700, color:s.fit_color }}>{s.fit_label}</span>
                    </div>
                    {s.can_use ? (
                      <div style={{ display:"flex", gap:8 }}>
                        {/* Backtest button */}
                        <button onClick={()=>{setBtStrat(s.strategy_id);runBacktest();}} disabled={btLoading}
                          style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontFamily:C.mono, fontSize:9, cursor:"pointer" }}>
                          {btLoading && btStrat===s.strategy_id ? "Testing..." : "🔬 Backtest"}
                        </button>
                        {/* Execute button */}
                        <button onClick={()=>executeSignal(s.strategy_id)} disabled={executing}
                          style={{ padding:"6px 14px", borderRadius:6, border:"none", background:s.fit===3?C.gold:C.surface, color:s.fit===3?"#000":C.text2, fontFamily:C.mono, fontSize:9, fontWeight:s.fit===3?700:400, cursor:"pointer" }}>
                          {executing?"Executing...":"▶ Execute"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, padding:"4px 10px", background:C.surface, borderRadius:6 }}>🔒 {(s.tier_required||"free").toUpperCase()}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Backtest result inline */}
              {btResult && (
                <div style={{ marginTop:16, padding:"16px 20px", background:C.surface2, border:`1px solid ${btResult.total_pnl>=0?C.green:C.red}30`, borderRadius:10 }}>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", marginBottom:12 }}>BACKTEST RESULT — {symbol} {tf}</div>
                  {btResult.error ? (
                    <div style={{ color:C.red, fontFamily:C.mono, fontSize:11 }}>{btResult.error}</div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                      {[
                        ["Trades", btResult.total_trades, C.text],
                        ["Win Rate", btResult.winrate_pct+"%", btResult.winrate_pct>=50?C.green:C.red],
                        ["Total PnL", "$"+btResult.total_pnl, btResult.total_pnl>=0?C.green:C.red],
                        ["Profit Factor", btResult.profit_factor, btResult.profit_factor>=1?C.green:C.red],
                        ["Max DD", btResult.max_drawdown_pct+"%", C.red],
                        ["Wins", btResult.winning_trades, C.green],
                        ["Losses", btResult.losing_trades, C.red],
                        ["Return", btResult.return_pct+"%", btResult.return_pct>=0?C.green:C.red],
                      ].map(([l,v,c])=>(
                        <div key={l} style={{ background:C.surface, borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ fontFamily:C.mono, fontSize:8, color:C.text3, marginBottom:4 }}>{l}</div>
                          <div style={{ fontFamily:C.mono, fontSize:13, fontWeight:700, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Execute result */}
              {execResult && (
                <div style={{ marginTop:12, padding:"10px 14px", background:execResult.startsWith("✓")?"rgba(61,214,140,0.08)":"rgba(240,107,107,0.08)", border:`1px solid ${execResult.startsWith("✓")?"rgba(61,214,140,0.3)":"rgba(240,107,107,0.3)"}`, borderRadius:8, fontFamily:C.mono, fontSize:12, color:execResult.startsWith("✓")?C.green:C.red }}>
                  {execResult}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}


// ── USER BLOG ─────────────────────────────────────────────────────────────────

function Overview({ user, summary, setActiveSection }) {
  const [regime, setRegime] = useState(null)
  useEffect(() => {
    api.post("/signal/market-intel", { symbol:"XAUUSD", timeframe:"H1", periods:200 })
      .then(r => setRegime(r.data)).catch(()=>{})
  }, [])

  const [activeTab,      setActiveTab]      = useState("calendar")
  const [selectedAsset,  setSelectedAsset]  = useState("XAUUSD")
  const [signal,         setSignal]         = useState(null)
  const [strategies,     setStrategies]     = useState([])
  const [myStrategies,   setMyStrategies]   = useState([])
  const [selectedStrat,  setSelectedStrat]  = useState("")
  const [activating,     setActivating]     = useState(false)
  const [stratToast,     setStratToast]     = useState("")
  const [activeStratId,  setActiveStratId]  = useState(null)
  const [stratRefresh,   setStratRefresh]   = useState(0)
  const [mt5Balance,     setMt5Balance]     = useState(null)
  const [mt5Status,      setMt5Status]      = useState(null)
  const [livePositions,  setLivePositions]  = useState([])

  const showStratToast = (msg) => { setStratToast(msg); setTimeout(() => setStratToast(""), 3000) }

  useEffect(() => {
    setSignal(null)  // clear old signal immediately
    api.post("/signal/run", { asset: selectedAsset, timeframe: "M5" })
      .then(r => setSignal(r.data))
      .catch(() => {})
  }, [selectedAsset])

  // Fetch MT5 live data — priority on load, retry fast until connected
  useEffect(() => {
    let retryCount = 0
    let intervalId = null

    const fetchMT5 = async () => {
      try {
        const [statusRes, balanceRes, posRes] = await Promise.allSettled([
          api.get("/trading/status"),
          api.get("/trading/balance"),
          api.get("/trading/positions"),
        ])
        if (statusRes.status  === "fulfilled") setMt5Status(statusRes.value.data)
        if (balanceRes.status === "fulfilled") setMt5Balance(balanceRes.value.data)
        if (posRes.status     === "fulfilled") setLivePositions(posRes.value.data?.positions || [])

        const connected = statusRes.value?.data?.connected
        if (connected) {
          // Connected — slow down to normal 15s polling
          clearInterval(intervalId)
          intervalId = setInterval(fetchMT5, 15000)
        } else if (retryCount < 5) {
          // Not connected yet — retry every 3s for first 5 attempts
          retryCount++
          clearInterval(intervalId)
          intervalId = setInterval(fetchMT5, 3000)
        } else {
          // Give up fast retries — settle to 30s
          clearInterval(intervalId)
          intervalId = setInterval(fetchMT5, 30000)
        }
      } catch {
        retryCount++
      }
    }

    // Fire immediately on mount
    fetchMT5()
    // Start with fast retry interval
    intervalId = setInterval(fetchMT5, 3000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    api.get("/strategies/").then(r => setStrategies(r.data || [])).catch(() => {})
    api.get("/strategies/mine").then(r => {
      setMyStrategies(r.data || [])
      const active = (r.data || []).find(s => s.is_active)
      if (active) setActiveStratId(active.id)
    }).catch(() => {})
  }, [])

  const handleStrategyActivate = async () => {
    if (!selectedStrat) { showStratToast("Select a strategy first"); return }
    setActivating(true)
    try {
      const plan = user?.subscription_plan || "free"
      const activeCount = myStrategies.filter(s => s.is_active).length
      if (plan === "free" && activeCount >= 1) {
        showStratToast("Free plan: deactivate your current strategy first")
        setActivating(false); return
      }
      const MT5_LIMITS = { free: 1, pro: 3, elite: 5, platinum: Infinity }
      const limit = MT5_LIMITS[plan] || 1
      if (activeCount >= limit) {
        showStratToast("Account limit reached: upgrade your plan to connect more MT5 accounts")
        setActivating(false); return
      }
      const strat = strategies.find(s => String(s.id) === String(selectedStrat))
      if (!strat) { showStratToast("Strategy not found"); setActivating(false); return }
      const tierReq = strat.default_params?.tier_required || "free"
      const tierOrder = { free: 0, pro: 1, elite: 2, platinum: 3 }
      if ((tierOrder[plan] || 0) < (tierOrder[tierReq] || 0)) {
        showStratToast(`This strategy requires ${tierReq.toUpperCase()} plan`)
        setActivating(false); return
      }
      const applyRes = await api.post("/strategies/apply", {
        strategy_id: strat.id,
        asset: selectedAsset,
        timeframe: strat.default_params?.timeframe || "M5",
        custom_params: { ...strat.default_params, strategy_name: strat.name },
      })
      const newStratId = applyRes.data.id
      await api.post(`/trading/start/${newStratId}`)
      setActiveStratId(newStratId)
      const refreshed = await api.get("/strategies/mine")
      setMyStrategies([...(refreshed.data || [])])
      setStratRefresh(p => p + 1)
      showStratToast(`✓ "${strat.name}" activated on ${selectedAsset}`)
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to activate"
      if (msg.includes("MT5")) {
        showStratToast("Connect your MT5 broker first — go to MT5 Connect")
      } else {
        showStratToast(msg)
      }
    }
    finally { setActivating(false) }
  }

  const handleDeactivate = async () => {
    if (!activeStratId) return
    setActivating(true)
    try {
      await api.post(`/trading/stop/${activeStratId}`)
      setActiveStratId(null)
      const refreshed = await api.get("/strategies/mine")
      setMyStrategies([...(refreshed.data || [])])
      setStratRefresh(p => p + 1)
      showStratToast("Strategy deactivated")
    } catch { showStratToast("Failed to deactivate") }
    finally { setActivating(false) }
  }

  const activeStrat = myStrategies.find(s => s.is_active)
  const plan = user?.subscription_plan || "free"
  const TIER_COLOR = { free: C.text3, pro: C.blue, elite: C.gold }
  const trades  = summary?.total_trades   || 0
  const wins    = summary?.winning_trades || 0
  const pnl     = summary?.daily_pnl      || 0
  const winrate = trades > 0 ? (wins / trades * 100).toFixed(1) : "—"
  const sigColor = signal?.signal === "BUY" ? C.green : signal?.signal === "SELL" ? C.red : C.gold

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: C.display, fontSize: 26, color: C.text, letterSpacing: "-0.01em", marginBottom: 2 }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            <span style={{ color: C.gold }}>{user?.email?.split("@")[0] || "Trader"}</span>
          </h2>
          <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>
            {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setActiveSection("trades")} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", background: C.gold, color: "#0d0f14",
            border: "none", borderRadius: 8, fontFamily: C.sans,
            fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e8bb55"; e.currentTarget.style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.transform = "translateY(0)" }}
          >
            <span style={{ fontSize: 16 }}>◉</span> Trade History
          </button>
          <button onClick={() => setActiveSection("signal")} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", background: "transparent",
            border: `1px solid ${C.border2}`, color: C.text2,
            borderRadius: 8, fontFamily: C.sans, fontWeight: 600,
            fontSize: 14, cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}
          >
            <span style={{ fontSize: 16 }}>△</span> Live Signal
          </button>
        </div>
      </div>

      {/* Strategy Selector */}
      <div style={{ marginBottom: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Active indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: activeStrat ? C.green : C.text3, boxShadow: activeStrat ? `0 0 6px ${C.green}` : "none" }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em" }}>
            {activeStrat ? "STRATEGY ACTIVE" : "NO ACTIVE STRATEGY"}
          </span>
        </div>

        {/* Active strategy pill */}
        {activeStrat && (
          <div style={{ padding: "4px 12px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 20, fontFamily: C.mono, fontSize: 10, color: C.green }}>
            {activeStrat.custom_params?.strategy_name || "Active strategy"}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 200 }}>
          <select value={selectedStrat} onChange={e => setSelectedStrat(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.text, outline: "none", cursor: "pointer" }}>
            <option value="">— Select a strategy —</option>
            {strategies.map(s => {
              const tierReq = s.default_params?.tier_required || "free"
              const tierOrder = { free: 0, pro: 1, elite: 2, platinum: 3 }
              const locked = (tierOrder[plan] || 0) < (tierOrder[tierReq] || 0)
              return (
                <option key={s.id} value={s.id} disabled={locked}>
                  {locked ? "🔒 " : ""}{s.name} {locked ? `(${tierReq})` : ""}
                </option>
              )
            })}
          </select>
        </div>

        {/* Selected strategy info */}
        {selectedStrat && (() => {
          const s = strategies.find(st => String(st.id) === String(selectedStrat))
          const tierReq = s?.default_params?.tier_required || "free"
          const cat = s?.default_params?.category || ""
          return s ? (
            <div style={{ fontFamily: C.mono, fontSize: 9, color: TIER_COLOR[tierReq], flexShrink: 0 }}>
              {tierReq.toUpperCase()} {cat ? `· ${cat.toUpperCase()}` : ""}
            </div>
          ) : null
        })()}

        {/* Activate / Deactivate button */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {activeStrat && (
            <button onClick={handleDeactivate} disabled={activating}
              style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.red}40`, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.redDim}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ◼ Deactivate
            </button>
          )}
          <button onClick={handleStrategyActivate} disabled={activating || !selectedStrat}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: selectedStrat ? C.gold : C.surface3, color: selectedStrat ? "#000" : C.text3, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.1em", fontWeight: 600, cursor: selectedStrat ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: activating ? 0.6 : 1 }}>
            {activating ? "..." : "▶ Activate"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Account Balance" value={mt5Balance?.balance ? "$" + Number(mt5Balance.balance).toLocaleString() : "-"} sub={mt5Balance?.server || "Connect MT5 to see live"} color={C.gold} />
        <StatCard label="Equity" value={mt5Balance?.equity ? "$" + Number(mt5Balance.equity).toLocaleString() : "-"} sub={mt5Balance?.currency || "Live equity"} color={C.blue} />
        <StatCard label="Floating P&L" value={mt5Balance?.profit !== undefined ? (mt5Balance.profit >= 0 ? "+" : "") + "$" + Math.abs(mt5Balance.profit).toFixed(2) : "-"} sub={livePositions.length + " open position" + (livePositions.length !== 1 ? "s" : "")} color={mt5Balance?.profit >= 0 ? C.green : C.red} />
        <StatCard label="Win Rate" value={winrate === "-" ? "-" : winrate + "%"} sub={`${wins}W · ${trades - wins}L all time`} color={C.green} />

      </div>
      {/* Row 2: Chart (left, bigger) + Signal + Strategy Upload (right column) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16, alignItems: "stretch" }}>

        {/* Live Signal Chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <SignalOverlay
            activeStrat={myStrategies.find(s => s.is_active) || null}
            selectedAsset={selectedAsset}
          />
        </div>

        {/* Right column: signal on top, strategy upload below */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* AI Signal */}
          <div style={{ background: C.surface, border: `1px solid ${sigColor}30`, borderRadius: 14, padding: "18px 20px", flex: "0 0 auto" }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 12 }}>AI SIGNAL · {selectedAsset}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, background: `radial-gradient(ellipse, ${sigColor}15 0%, transparent 70%)` }} />
                <div style={{ fontFamily: C.display, fontSize: 48, color: sigColor, lineHeight: 1, position: "relative", minWidth: 120, textAlign: "center" }}>
                  {signal?.signal || "—"}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.mono, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{signal?.latest_price || "—"}</div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>{signal?.reason || "Loading..."}</div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>CONFIDENCE</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: sigColor }}>{((signal?.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(signal?.confidence || 0) * 100}%`, background: sigColor, borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Intel Card */}
          <div onClick={() => setActiveSection("intel")} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", cursor: "pointer", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface2, flexShrink: 0 }}>
              <span style={{ fontSize: 15 }}>🧬</span>
              <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>Market Intel</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, marginLeft: "auto" }}>AI ANALYSIS →</span>
            </div>
            <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
                Detects live market regime — Trending, Ranging, Volatile or Breakout — and recommends the best strategy for current conditions with one-click execution.
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Regime Detection","Strategy Scoring","Pattern Match","Execute"].map(f => (
                  <span key={f} style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, padding: "3px 8px", background: C.goldDim, border: `1px solid ${C.gold}20`, borderRadius: 4 }}>{f}</span>
                ))}
              </div>
              <button style={{ marginTop: "auto", padding: "10px", borderRadius: 8, border: `1px solid ${C.gold}40`, background: C.goldDim, color: C.gold, fontFamily: C.mono, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Open Market Intel →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Live Positions — quick action widget */}
      <OverviewLivePositions />

      {/* Row 3: Market Watch — full width strip */}
      <MarketWatchStrip onSelectAsset={setSelectedAsset} selectedAsset={selectedAsset} />
      {stratToast && <div style={{ position: "fixed", bottom: 24, right: 24, background: stratToast.startsWith("✓") ? C.green : C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{stratToast}</div>}

      {/* Row 4: Calendar + News tabs — full width */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
          {[
            { id: "calendar", label: "Economic Calendar" },
            { id: "news",     label: "Market News"       },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "12px 22px", background: "transparent",
              border: "none", borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
              fontFamily: C.sans, fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? C.gold : C.text3,
              cursor: "pointer", transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>
        <div style={{ padding: "20px 22px" }}>
          {activeTab === "calendar" && <EconomicCalendar />}
          {activeTab === "news"     && <MarketNews />}
        </div>
      </div>
    </div>
  )
}

// ACCOUNT STRATEGIES WIDGET
function AccountStrategies() {
  const [strategies, setStrategies] = useState([])

  useEffect(() => {
    api.get("/strategies/mine").then(r => setStrategies(r.data)).catch(() => {})
  }, [])

  if (strategies.length === 0) {
    return (
      <div style={{ padding: "10px 12px", background: C.surface3, borderRadius: 8 }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 4 }}>APPLIED STRATEGIES</div>
        <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>No strategies applied yet. Go to Strategy Builder to create one.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: "10px 12px", background: C.surface3, borderRadius: 8 }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 8 }}>APPLIED STRATEGIES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {strategies.map(us => {
          const p = us.custom_params || {}
          const inds = Array.isArray(p.indicators) ? p.indicators : ["EMA","RSI","MACD"]
          return (
            <div key={us.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: C.surface2, borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: us.is_active ? C.green : C.text3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.text }}>{p.strategy_name || "EMA_RSI_MACD"}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{us.asset} · {us.timeframe}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {inds.slice(0,3).map(ind => (
                  <span key={ind} style={{ fontFamily: C.mono, fontSize: 8, padding: "1px 6px", borderRadius: 3, background: C.goldDim, color: C.gold }}>{ind}</span>
                ))}
                <Badge label={us.is_active ? "LIVE" : "IDLE"} color={us.is_active ? C.green : C.text3} dim={us.is_active ? C.greenDim : "rgba(90,96,112,0.08)"} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// MT5 CONNECT
function MT5Connect() {
  const [form,        setForm]        = useState({ account_number: "", password: "", server: "", broker_name: "" })
  const [accounts,    setAccounts]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState("")
  const [error,       setError]       = useState("")
  const [agentStatus, setAgentStatus] = useState({ agent_connected: false, has_account: false })
  const [user,        setUser]        = useState(null)

  useEffect(() => {
    api.get("/mt5/accounts").then(r => setAccounts(r.data)).catch(() => {})
    api.get("/trading/status").then(r => setAgentStatus(r.data)).catch(() => {})
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => {})
  }, [success])

  useEffect(() => {
    const id = setInterval(() => {
      api.get("/trading/status").then(r => setAgentStatus(r.data)).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError(""); setSuccess("")
    try {
      await api.post("/mt5/connect", form)
      setSuccess("MT5 account connected successfully.")
      setForm({ account_number: "", password: "", server: "", broker_name: "" })
    } catch (err) { setError(err.response?.data?.detail || "Failed to connect.") }
    finally { setLoading(false) }
  }

  const handleDelete = async id => {
    try { await api.delete(`/mt5/disconnect/${id}`); setAccounts(a => a.filter(x => x.id !== id)) } catch {}
  }

  return (
    <div>
      <SectionHeader title="MT5 Connect" sub="Link your broker MT5 account. Your password is encrypted end-to-end." />

      {/* EA Download */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px", marginBottom: 28 }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 6 }}>STEP 1 — DOWNLOAD & INSTALL THE EA</div>
        <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 20, lineHeight: 1.7 }}>
          The PesaPips Expert Advisor bridges MetaTrader 5 to the AI engine. Install it once — it runs silently in the background.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["01", "Download the EA file below"],
              ["02", "In MT5: File → Open Data Folder → MQL5 → Experts"],
              ["03", "Copy PesaPipsEA.ex5 into MT5 → MQL5 → Experts folder (Windows: no compilation needed)"],
              ["04", "Restart MT5, drag EA onto any chart, enable Allow DLL imports"],
              ["05", "Return here and add your account below"],
            ].map(([n, s]) => (
              <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${C.gold}15`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 9, color: C.gold, flexShrink: 0, marginTop: 1 }}>{n}</div>
                <span style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </div>
          {/* Code preview */}
          <div style={{ background: "#0a0c12", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{ background: "#13162a", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              {["#f06b6b","#f5c842","#3dd68c"].map((c,i) => <div key={i} style={{ width:9, height:9, borderRadius:"50%", background:c }} />)}
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginLeft: 6 }}>PesaPipsEA.mq5</span>
            </div>
            <div style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: 10, lineHeight: 1.9 }}>
              {[
                ["#4a4f6a", "// PesaPips EA v2.0"],
                ["#a78bfa", 'input string SERVER = "localhost";'],
                ["#a78bfa", "input int    PORT   = 9090;"],
                ["#4a4f6a", ""],
                ["#c8cce8", "void OnTick() {"],
                ["#3dd68c", "  bridge.sync();"],
                ["#3dd68c", "  if(signal) trade.Execute();"],
                ["#c8cce8", "}"],
              ].map(([color, line], i) => (
                <div key={i} style={{ color }}>{line || " "}</div>
              ))}
            </div>
          </div>
        </div>
        {/* Download button */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/PesaPipsEA.ex5" download style={{ padding: "10px 22px", borderRadius: 8, background: C.gold, color: "#000", fontFamily: C.mono, fontSize: 11, fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em" }}>
              ⬇ Download PesaPipsEA.ex5
            </a>
            <a href="/PesaPipsEA.mq5" download style={{ padding: "10px 22px", borderRadius: 8, background: "transparent", color: C.gold, fontFamily: C.mono, fontSize: 11, fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em", border: `1px solid ${C.gold}` }}>
              ⬇ Source PesaPipsEA.mq5
            </a>
            <a href="/pesapips_agent.py" download style={{ padding: "10px 22px", borderRadius: 8, background: "transparent", color: C.blue, fontFamily: C.mono, fontSize: 11, fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em", border: `1px solid ${C.blue}` }}>
              ⬇ Download Agent (Python)
            </a>
          </div>
          <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginTop: 8 }}>
            💡 <strong style={{ color: C.text }}>Windows users:</strong> Use the .ex5 file — no compilation needed. Drag it into MT5 Experts folder and attach to any chart.<br/>
            💡 <strong style={{ color: C.text }}>Linux/Mac users:</strong> Use the .mq5 source and compile inside MT5 via Wine.
          </div>
          <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginTop: 8 }}>
            Then run the agent: <code style={{ background: C.surface3, padding: "2px 6px", borderRadius: 4, color: C.gold }}>python3 pesapips_agent.py --token YOUR_TOKEN --user-id YOUR_ID</code>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>Compatible with MT5 build 3000+</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 22 }}>STEP 2 — ADD YOUR ACCOUNT</div>
          {error   && <div style={{ background: C.redDim,   border: `1px solid ${C.red}30`,   borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red,   fontFamily: C.sans }}>⚠ {error}</div>}
          {success && <div style={{ background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.green, fontFamily: C.sans }}>✓ {success}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { name: "account_number", label: "ACCOUNT NUMBER",    placeholder: "e.g. 12345678",         type: "text"     },
              { name: "password",       label: "MT5 PASSWORD",      placeholder: "Your MT5 password",     type: "password" },
              { name: "server",         label: "SERVER",            placeholder: "e.g. ICMarkets-Live01", type: "text"     },
              { name: "broker_name",    label: "BROKER (optional)", placeholder: "e.g. ICMarkets",        type: "text"     },
            ].map(f => (
              <div key={f.name}>
                <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>{f.label}</label>
                <input name={f.name} type={f.type} value={form[f.name]} placeholder={f.placeholder}
                  onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ ...btnGold, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Connecting..." : "Connect account"}
            </button>
          </form>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 22 }}>CONNECTED ACCOUNTS</div>
          {accounts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>No accounts connected yet.</div>
            </div>
          ) : accounts.map(acc => (
            <div key={acc.id} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{acc.account_number}</div>
                  <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>{acc.server}</div>
                  {acc.broker_name && <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{acc.broker_name}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <Badge label={acc.is_active ? "ACTIVE" : "INACTIVE"} color={acc.is_active ? C.green : C.text3} dim={acc.is_active ? C.greenDim : "rgba(90,96,112,0.1)"} />
                  <button onClick={() => handleDelete(acc.id)} style={{ background: "none", border: "none", color: C.red, fontFamily: C.mono, fontSize: 10, cursor: "pointer", opacity: 0.7 }}
                    onMouseEnter={e => e.target.style.opacity = "1"}
                    onMouseLeave={e => e.target.style.opacity = "0.7"}
                  >disconnect</button>
                </div>
              </div>
              {/* Strategies applied to this account */}
              <AccountStrategies userId={acc.user_id} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20, padding: "14px 18px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 10, display: "flex", gap: 12 }}>
        <span style={{ color: C.gold, fontSize: 16 }}>◈</span>
        <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>Your MT5 password is encrypted using AES-256 Fernet before storage. PesaPips can only place and close trades — we cannot withdraw funds.</p>
      </div>

      {/* ── AFFILIATE BROKER PANEL ── */}
      <div style={{ marginTop: 24, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 4 }}>DON'T HAVE A BROKER ACCOUNT YET?</div>
            <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 600, color: C.text }}>Open a free trading account with our recommended partner</div>
          </div>
          <div style={{ padding: "4px 12px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 6, fontFamily: C.mono, fontSize: 9, color: C.green, flexShrink: 0 }}>
            RECOMMENDED
          </div>
        </div>

        {/* Broker card */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
            {/* HFM Logo */}
            <div style={{ width: 80, height: 80, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <img src="https://www.hfm.com/favicon.ico" alt="HFM"
                style={{ width: 48, height: 48, objectFit: "contain" }}
                onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<div style="font-family:sans-serif;font-size:18px;font-weight:900;color:#e63946">HFM</div>' }} />
            </div>

            {/* Broker details */}
            <div>
              <div style={{ fontFamily: C.display, fontSize: 20, color: C.text, marginBottom: 6 }}>HFM (HF Markets)</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 10 }}>
                Regulated broker with tight spreads on gold and forex. Supports MT5, instant withdrawals and a free demo account. Used by over 3.5 million traders worldwide.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["FCA Regulated", "MT5 Supported", "Instant Deposits", "Free Demo", "Low Spreads on Gold"].map(f => (
                  <span key={f} style={{ padding: "3px 10px", borderRadius: 4, background: C.surface2, border: `1px solid ${C.border2}`, fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{f}</span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", flexShrink: 0 }}>
              <a href="https://register.hfm.com/ke/en/new-live-account/?refid=30359412"
                target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "12px 24px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #e63946, #c1121f)",
                  color: "#fff", fontFamily: C.mono, fontSize: 11,
                  letterSpacing: "0.1em", fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(230,57,70,0.3)",
                  transition: "all 0.2s", whiteSpace: "nowrap",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(230,57,70,0.4)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(230,57,70,0.3)" }}
                >
                  Open Live Account →
                </button>
              </a>
              <a href="https://register.hfm.com/ke/en/new-live-account/?refid=30359412"
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, textDecoration: "none", letterSpacing: "0.08em" }}
                onMouseEnter={e => e.target.style.color = C.text}
                onMouseLeave={e => e.target.style.color = C.text3}>
                Open free demo instead →
              </a>
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 12 }}>HOW TO GET STARTED</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { step: "1", label: "Open account", desc: "Click the button above and register with HFM" },
                { step: "2", label: "Verify identity", desc: "Upload ID and proof of address (takes ~1 hour)" },
                { step: "3", label: "Fund & get MT5", desc: "Deposit and download MT5 — note your account number and server" },
                { step: "4", label: "Connect here", desc: "Enter your MT5 details in the form above to activate AI trading" },
              ].map(s => (
                <div key={s.step} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontFamily: C.display, fontSize: 22, color: C.gold, marginBottom: 6 }}>{s.step}</div>
                  <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ padding: "10px 24px", borderTop: `1px solid ${C.border}`, background: C.surface2 }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, lineHeight: 1.6 }}>
            PesaPips is an affiliate partner of HFM. We may earn a commission if you open an account using our link at no extra cost to you. Trading involves risk — only trade what you can afford to lose.
          </div>
        </div>
      </div>
    </div>
  )
}

// STRATEGY BUILDER
const ALL_INDICATORS = [
  { id: "EMA",       label: "EMA",         desc: "Trend direction via moving average crossover",  color: C.gold   },
  { id: "RSI",       label: "RSI",         desc: "Momentum — overbought/oversold filter",          color: C.blue   },
  { id: "MACD",      label: "MACD",        desc: "Entry confirmation via histogram crossover",     color: C.green  },
  { id: "BOLLINGER", label: "Bollinger",   desc: "Volatility bands — price extremes",              color: "#a78bfa"},
  { id: "STOCH",     label: "Stochastic",  desc: "Momentum oscillator similar to RSI",             color: C.red    },
  { id: "ATR",       label: "ATR",         desc: "Volatility filter — avoids choppy markets",      color: "#f97316"},
  { id: "CCI",       label: "CCI",         desc: "Commodity Channel Index — trend + momentum",     color: "#06b6d4"},
]

const INDICATOR_PARAMS = {
  EMA:       [{ key: "ema_fast", label: "Fast period", step: 1, min: 2 }, { key: "ema_mid", label: "Mid period", step: 1, min: 5 }, { key: "ema_slow", label: "Slow period", step: 1, min: 10 }],
  RSI:       [{ key: "rsi_period", label: "Period", step: 1, min: 2 }, { key: "rsi_buy", label: "Oversold level", step: 1, min: 10 }, { key: "rsi_sell", label: "Overbought level", step: 1, min: 50 }],
  MACD:      [{ key: "macd_fast", label: "Fast", step: 1, min: 2 }, { key: "macd_slow", label: "Slow", step: 1, min: 5 }, { key: "macd_signal", label: "Signal", step: 1, min: 2 }],
  BOLLINGER: [{ key: "bb_period", label: "Period", step: 1, min: 5 }, { key: "bb_std", label: "Std deviation", step: 0.1, min: 0.5 }],
  STOCH:     [{ key: "stoch_k", label: "K period", step: 1, min: 2 }, { key: "stoch_d", label: "D period", step: 1, min: 1 }, { key: "stoch_buy", label: "Oversold", step: 1, min: 5 }, { key: "stoch_sell", label: "Overbought", step: 1, min: 50 }],
  ATR:       [{ key: "atr_period", label: "Period", step: 1, min: 2 }],
  CCI:       [{ key: "cci_period", label: "Period", step: 1, min: 5 }, { key: "cci_buy", label: "Oversold", step: 1 }, { key: "cci_sell", label: "Overbought", step: 1 }],
}

const DEFAULT_PARAMS = {
  ema_fast: 9, ema_mid: 21, ema_slow: 50,
  rsi_period: 14, rsi_buy: 30, rsi_sell: 70,
  macd_fast: 12, macd_slow: 26, macd_signal: 9,
  bb_period: 20, bb_std: 2.0,
  stoch_k: 14, stoch_d: 3, stoch_buy: 20, stoch_sell: 80,
  atr_period: 14,
  cci_period: 20, cci_buy: -100, cci_sell: 100,
  risk_per_trade: 1.0, sl_pips: 15, tp_pips: 30,
}

function Strategy() {
  const [tab,          setTab]          = useState("builder")
  const [name,         setName]         = useState("")
  const [selectedInds, setSelectedInds] = useState(["EMA","RSI","MACD"])
  const [params,       setParams]       = useState({ ...DEFAULT_PARAMS })
  const [asset,        setAsset]        = useState("XAUUSD")
  const [timeframe,    setTimeframe]    = useState("M5")
  const [mine,         setMine]         = useState([])
  const [loading,      setLoading]      = useState(false)
  const [btResult,     setBtResult]     = useState(null)
  const [btLoading,    setBtLoading]    = useState(false)
  const [success,      setSuccess]      = useState("")
  const [error,        setError]        = useState("")

  useEffect(() => {
    api.get("/strategies/mine").then(r => setMine(r.data)).catch(() => {})
  }, [success])

  const toggleIndicator = ind => {
    setSelectedInds(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    )
  }

  const handleSaveApply = async () => {
    if (!name.trim()) { setError("Please give your strategy a name."); return }
    if (selectedInds.length === 0) { setError("Select at least one indicator."); return }
    setLoading(true); setError(""); setSuccess("")
    try {
      const fullParams = { ...params, indicators: selectedInds, strategy_name: name }
      await api.post("/strategies/apply", {
        strategy_id: 1,
        asset, timeframe,
        custom_params: fullParams,
      })
      setSuccess(`Strategy "${name}" saved and applied to ${asset} ${timeframe}.`)
      api.get("/strategies/mine").then(r => setMine(r.data)).catch(() => {})
    } catch (err) { setError(err.response?.data?.detail || "Failed to apply.") }
    finally { setLoading(false) }
  }

  const handleBacktest = async () => {
    setBtLoading(true); setBtResult(null)
    try {
      const fullParams = { ...params, indicators: selectedInds }
      const res = await api.post("/signal/backtest", { asset, timeframe, params: fullParams })
      setBtResult(res.data)
    } catch {}
    finally { setBtLoading(false) }
  }

  const handleActivate = async (id) => {
    try {
      await api.post(`/trading/start/${id}`)
      setSuccess("Strategy activated — AI engine is now trading with this strategy.")
      api.get("/strategies/mine").then(r => setMine(r.data)).catch(() => {})
    } catch (err) { setError(err.response?.data?.detail || "Failed to activate.") }
  }

  const handleDeactivate = async (id) => {
    try {
      await api.post(`/trading/stop/${id}`)
      setSuccess("Strategy deactivated.")
      api.get("/strategies/mine").then(r => setMine(r.data)).catch(() => {})
    } catch {}
  }

  return (
    <div>
      <SectionHeader title="Strategy Builder" sub="Build, name, backtest and deploy your own trading strategies." />

      {error   && <div style={{ background: C.redDim,   border: `1px solid ${C.red}30`,   borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red,   fontFamily: C.sans }}>⚠ {error}</div>}
      {success && <div style={{ background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.green, fontFamily: C.sans }}>✓ {success}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        {[{ id: "builder", label: "Build Strategy" }, { id: "mine", label: `My Strategies (${mine.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "11px 20px", background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? C.gold : C.text3, cursor: "pointer", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>

          {/* Left — builder */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Strategy name + asset + timeframe */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 16 }}>STRATEGY IDENTITY</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "span 1" }}>
                  <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>STRATEGY NAME</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gold Scalper v1"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>ASSET</label>
                  <select value={asset} onChange={e => setAsset(e.target.value)} style={inputStyle}>
                    {["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","BTCUSD","ETHUSD","OIL","NASDAQ","DOW","SPX","DXY","USDKES"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>TIMEFRAME</label>
                  <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={inputStyle}>
                    {["M1","M5","M15","M30","H1","H4","D1"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Indicator picker */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 6 }}>INDICATORS</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginBottom: 16 }}>Select which indicators must confirm before a signal is generated. More indicators = higher confluence required.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {ALL_INDICATORS.map(ind => {
                  const active = selectedInds.includes(ind.id)
                  return (
                    <div key={ind.id} onClick={() => toggleIndicator(ind.id)} style={{
                      padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                      background: active ? `${ind.color}12` : C.surface2,
                      border: `1px solid ${active ? ind.color + "50" : C.border}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: active ? ind.color : C.text2 }}>{ind.label}</span>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${active ? ind.color : C.border2}`, background: active ? ind.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#000" }} />}
                        </div>
                      </div>
                      <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3, lineHeight: 1.4 }}>{ind.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Parameters for selected indicators */}
            {selectedInds.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 16 }}>INDICATOR PARAMETERS</div>
                {selectedInds.map(ind => (
                  <div key={ind} style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: ALL_INDICATORS.find(i => i.id === ind)?.color || C.text2, letterSpacing: "0.1em", marginBottom: 10 }}>{ind}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {(INDICATOR_PARAMS[ind] || []).map(f => (
                        <div key={f.key}>
                          <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{f.label.toUpperCase()}</label>
                          <input type="number" step={f.step} min={f.min} value={params[f.key] ?? ""}
                            onChange={e => setParams(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))}
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = C.gold}
                            onBlur={e => e.target.style.borderColor = C.border2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Risk settings always shown */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 8 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.1em", marginBottom: 10 }}>RISK MANAGEMENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      { key: "risk_per_trade", label: "Risk %",     step: 0.1 },
                      { key: "sl_pips",        label: "SL (pips)",  step: 1   },
                      { key: "tp_pips",        label: "TP (pips)",  step: 1   },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{f.label.toUpperCase()}</label>
                        <input type="number" step={f.step} value={params[f.key] ?? ""}
                          onChange={e => setParams(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))}
                          style={inputStyle}
                          onFocus={e => e.target.style.borderColor = C.gold}
                          onBlur={e => e.target.style.borderColor = C.border2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — preview + actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Strategy preview */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 16 }}>STRATEGY PREVIEW</div>
              <div style={{ fontFamily: C.display, fontSize: 18, color: C.text, marginBottom: 4 }}>{name || "Unnamed strategy"}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, marginBottom: 16 }}>{asset} · {timeframe}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {selectedInds.map(ind => {
                  const info = ALL_INDICATORS.find(i => i.id === ind)
                  return <span key={ind} style={{ padding: "3px 10px", borderRadius: 4, fontFamily: C.mono, fontSize: 10, fontWeight: 700, background: `${info?.color}15`, color: info?.color, border: `1px solid ${info?.color}30` }}>{ind}</span>
                })}
              </div>
              <div style={{ padding: "12px 14px", background: C.surface2, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>ENTRY LOGIC</div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
                  <strong style={{ color: C.green }}>BUY</strong> when {selectedInds.length > 0 ? selectedInds.map(i => {
                    if (i === "EMA") return `EMA${params.ema_fast} > EMA${params.ema_mid} > EMA${params.ema_slow}`
                    if (i === "RSI") return `RSI < ${params.rsi_buy}`
                    if (i === "MACD") return "MACD cross up"
                    if (i === "BOLLINGER") return "price at lower band"
                    if (i === "STOCH") return `Stoch < ${params.stoch_buy}`
                    if (i === "CCI") return `CCI < ${params.cci_buy}`
                    return i
                  }).join(" + ") : "no indicators selected"}<br/>
                  <strong style={{ color: C.red }}>SELL</strong> when {selectedInds.length > 0 ? selectedInds.map(i => {
                    if (i === "EMA") return `EMA${params.ema_fast} < EMA${params.ema_mid} < EMA${params.ema_slow}`
                    if (i === "RSI") return `RSI > ${params.rsi_sell}`
                    if (i === "MACD") return "MACD cross down"
                    if (i === "BOLLINGER") return "price at upper band"
                    if (i === "STOCH") return `Stoch > ${params.stoch_sell}`
                    if (i === "CCI") return `CCI > ${params.cci_sell}`
                    return i
                  }).join(" + ") : "no indicators selected"}
                </div>
              </div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>
                SL: {params.sl_pips} pips · TP: {params.tp_pips} pips · Risk: {params.risk_per_trade}%
              </div>
            </div>

            {/* Backtest result */}
            {btResult && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 14 }}>BACKTEST RESULT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["Trades",       btResult.total_trades,          C.blue  ],
                    ["Win rate",     btResult.winrate_pct + "%",      btResult.winrate_pct >= 50 ? C.green : C.red],
                    ["Total PnL",    "$" + btResult.total_pnl,        btResult.total_pnl >= 0 ? C.green : C.red],
                    ["Profit factor",btResult.profit_factor,          btResult.profit_factor >= 1 ? C.green : C.red],
                    ["Max DD",       btResult.max_drawdown_pct + "%", C.red   ],
                    ["Return",       btResult.return_pct + "%",       btResult.return_pct >= 0 ? C.green : C.red],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 4 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>
                {btResult.total_trades > 0 && (
                  <button onClick={handleSaveApply} style={{ ...btnGold, width: "100%", marginTop: 14 }}>
                    Apply this strategy to my account →
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleBacktest} disabled={btLoading} style={{ ...btnOutline, width: "100%", opacity: btLoading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {btLoading ? "Running backtest..." : "◇ Run backtest first"}
              </button>
              <button onClick={handleSaveApply} disabled={loading} style={{ ...btnGold, width: "100%", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Saving..." : "Save & apply to engine"}
              </button>
              <div style={{ padding: "12px 14px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 8 }}>
                <p style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                  We recommend backtesting before going live. Once applied, the AI engine will use this strategy to trade your connected MT5 account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "builder" && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 16 }}>IMPORT CUSTOM STRATEGY JSON</div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
              <span style={{ color: C.gold, fontSize: 15 }}>◇</span>
              <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>Strategy Upload</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginLeft: "auto" }}>JSON · VALIDATE · APPLY</span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <StrategyUpload fillHeight={false} />
            </div>
          </div>
        </div>
      )}

      {tab === "mine" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mine.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>◎</div>
              <div style={{ fontFamily: C.sans, fontSize: 15, color: C.text3, marginBottom: 8 }}>No strategies saved yet.</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, opacity: 0.6 }}>Build and save a strategy in the builder tab to see it here.</div>
            </div>
          ) : mine.map(us => {
            const p = us.custom_params || {}
            const inds = Array.isArray(p.indicators) ? p.indicators : ["EMA","RSI","MACD"]
            return (
              <div key={us.id} style={{ background: C.surface, border: `1px solid ${us.is_active ? "rgba(212,168,67,0.3)" : C.border}`, borderRadius: 14, padding: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: C.display, fontSize: 18, color: C.text, marginBottom: 4 }}>
                      {p.strategy_name || "EMA_RSI_MACD"}
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{us.asset} · {us.timeframe}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge label={us.is_active ? "ACTIVE" : "IDLE"} color={us.is_active ? C.green : C.text3} dim={us.is_active ? C.greenDim : "rgba(90,96,112,0.1)"} />
                    {us.is_active ? (
                      <button onClick={() => handleDeactivate(us.id)} style={{ ...btnOutline, padding: "7px 14px", fontSize: 12, color: C.red, borderColor: `${C.red}40` }}>Deactivate</button>
                    ) : (
                      <button onClick={() => handleActivate(us.id)} style={{ ...btnGold, padding: "7px 14px", fontSize: 12 }}>Activate</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {inds.map(ind => {
                    const info = ALL_INDICATORS.find(i => i.id === ind)
                    return <span key={ind} style={{ padding: "2px 8px", borderRadius: 4, fontFamily: C.mono, fontSize: 10, background: `${info?.color || C.gold}15`, color: info?.color || C.gold, border: `1px solid ${info?.color || C.gold}30` }}>{ind}</span>
                  })}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {[
                    ["Risk", (p.risk_per_trade || 1) + "%",   C.gold  ],
                    ["SL",   (p.sl_pips || 15) + " pips",     C.red   ],
                    ["TP",   (p.tp_pips || 30) + " pips",     C.green ],
                    ["EMA",  `${p.ema_fast||9}/${p.ema_mid||21}/${p.ema_slow||50}`, C.text2],
                    ["RSI",  `${p.rsi_buy||30}/${p.rsi_sell||70}`,                  C.text2],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// LIVE SIGNAL
function LiveSignal({ userPlan = 'free' }) {
  const [result,        setResult]        = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [asset,         setAsset]         = useState("XAUUSD")
  const [timeframe,     setTimeframe]     = useState("M5")
  const [autoRefresh,   setAutoRefresh]   = useState(false)
  const [myStrategies,  setMyStrategies]  = useState([])
  const [libStrategies, setLibStrategies] = useState([])
  const [selectedStrat, setSelectedStrat] = useState("")
  const [currentUser,        setLsUser]        = useState(null)

  useEffect(() => {
    api.get("/strategies/mine").then(r => setMyStrategies(r.data)).catch(() => {})
    api.get("/strategies/").then(r => setLibStrategies(r.data)).catch(() => {})
    api.get("/auth/me").then(r => setLsUser(r.data)).catch(() => {})
  }, [])

  const FREE_LIMIT = 5
  const runsToday  = getSignalRunsToday()
  const limitHit   = userPlan === "free" && runsToday >= FREE_LIMIT

  const fetchSignal = async () => {
    if (userPlan === "free" && getSignalRunsToday() >= FREE_LIMIT) return
    setLoading(true)
    try {
      let body = { asset, timeframe }
      if (selectedStrat !== "") {
        if (String(selectedStrat).startsWith("lib_")) {
          const libId = parseInt(selectedStrat.replace("lib_", ""))
          const strat = libStrategies.find(s => s.id === libId)
          if (strat?.default_params) body.params = { ...strat.default_params, strategy_name: strat.name }
        } else {
          const strat = myStrategies.find(s => s.id === parseInt(selectedStrat))
          if (strat?.custom_params) body.params = strat.custom_params
        }
      }
      const res = await api.post("/signal/run", body)
      setResult(res.data)
      if (userPlan === "free") incrementSignalRuns()
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSignal() }, [])
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchSignal, 5000)
    return () => clearInterval(id)
  }, [autoRefresh, asset, timeframe, selectedStrat])

  const sigColor = result?.signal === "BUY" ? C.green : result?.signal === "SELL" ? C.red : C.gold

  const activeStrat = selectedStrat !== "" ? myStrategies.find(s => s.id === parseInt(selectedStrat)) : null
  const activeInds  = activeStrat?.custom_params?.indicators
    ? (Array.isArray(activeStrat.custom_params.indicators)
        ? activeStrat.custom_params.indicators
        : activeStrat.custom_params.indicators.split(","))
    : ["EMA", "RSI", "MACD"]

  const IND_COLORS = { EMA: C.gold, RSI: C.blue, MACD: C.green, BOLLINGER: "#a78bfa", STOCH: C.red, ATR: "#f97316", CCI: "#06b6d4" }

  return (
    <div>
      <SectionHeader title="Live Signal" sub="Pick a strategy and run the AI signal engine against live market data." />
      {userPlan === "free" && (
        <div style={{ marginBottom: 16, padding: "10px 16px", background: runsToday >= FREE_LIMIT ? C.redDim : C.goldDim, border: `1px solid ${runsToday >= FREE_LIMIT ? C.red : C.gold}30`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, color: runsToday >= FREE_LIMIT ? C.red : C.gold }}>
            {runsToday >= FREE_LIMIT ? "Daily limit reached — upgrade for unlimited signal runs" : `Free plan: ${FREE_LIMIT - runsToday} signal run${FREE_LIMIT - runsToday !== 1 ? "s" : ""} remaining today`}
          </span>
          {runsToday >= FREE_LIMIT && (
            <button onClick={() => alert("Contact support@pesapips.com to upgrade")}
              style={{ ...btnGold, padding: "5px 12px", fontSize: 9 }}>Upgrade →</button>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 12, alignItems: "end" }}>

          {/* Strategy picker */}
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>STRATEGY</label>
            <select
              value={selectedStrat}
              onChange={e => setSelectedStrat(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Default (EMA + RSI + MACD) —</option>
              {libStrategies.length > 0 && (
                <optgroup label="--- Strategy Library ---">
                  {libStrategies.map(s => {
                    const tierReq = s.default_params?.tier_required || "free"
                    const tierOrder = { free: 0, pro: 1, elite: 2, platinum: 3 }
                    const plan = (typeof currentUser !== 'undefined' ? currentUser : btUser)?.subscription_plan || "free"
                    const locked = (tierOrder[plan] || 0) < (tierOrder[tierReq] || 0)
                    return (
                      <option key={"lib_"+s.id} value={"lib_"+s.id} disabled={locked}>
                        {locked ? "🔒 " : ""}{s.name} {locked ? "("+tierReq+")" : "· "+s.default_params?.timeframe}
                      </option>
                    )
                  })}
                </optgroup>
              )}
              {myStrategies.length > 0 && (
                <optgroup label="--- My Saved Strategies ---">
                  {myStrategies.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.custom_params?.strategy_name || "Unnamed"} · {s.asset} · {s.timeframe}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Asset */}
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>ASSET</label>
            <select value={asset} onChange={e => setAsset(e.target.value)} style={inputStyle}>
              {["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","BTCUSD","ETHUSD","OIL","NASDAQ","DOW","SPX","DXY","USDKES"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>TIMEFRAME</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={inputStyle}>
              {["M1","M5","M15","M30","H1","H4","D1"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Run button */}
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: "transparent", display: "block", marginBottom: 7 }}>·</label>
            <button onClick={fetchSignal} disabled={loading} style={{ ...btnGold, opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
              {loading ? "Running..." : "Run signal"}
            </button>
          </div>

          {/* Auto refresh */}
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: "transparent", display: "block", marginBottom: 7 }}>·</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: 12, color: C.text2, cursor: "pointer", paddingTop: 10 }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: C.gold }} />
              Auto 5s
            </label>
          </div>
        </div>

        {/* Active strategy info strip */}
        {activeStrat && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: C.surface2, borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em" }}>USING:</span>
            <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>
              {activeStrat.custom_params?.strategy_name || "Unnamed"}
            </span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
              {activeStrat.asset} · {activeStrat.timeframe}
            </span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {activeInds.map(ind => (
                <span key={ind} style={{
                  fontFamily: C.mono, fontSize: 9, padding: "2px 8px", borderRadius: 4,
                  background: `${IND_COLORS[ind.trim()] || C.gold}18`,
                  color: IND_COLORS[ind.trim()] || C.gold,
                  border: `1px solid ${IND_COLORS[ind.trim()] || C.gold}35`,
                }}>{ind.trim()}</span>
              ))}
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginLeft: "auto" }}>
              SL {activeStrat.custom_params?.sl_pips || 15}p · TP {activeStrat.custom_params?.tp_pips || 30}p · Risk {activeStrat.custom_params?.risk_per_trade || 1}%
            </span>
          </div>
        )}
      </div>

      {/* Signal result */}
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>

          {/* Signal box */}
          <div style={{ background: C.surface, border: `1px solid ${sigColor}40`, borderRadius: 14, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 180, height: 180, background: `radial-gradient(ellipse, ${sigColor}12 0%, transparent 70%)` }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.15em", marginBottom: 12 }}>AI SIGNAL</div>
              <div style={{ fontFamily: C.display, fontSize: 58, color: sigColor, lineHeight: 1, marginBottom: 10 }}>{result.signal}</div>
              <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>{result.latest_price}</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, marginBottom: 14 }}>{asset} · {timeframe}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: `${sigColor}15`, border: `1px solid ${sigColor}30`, borderRadius: 20, marginBottom: 14 }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: sigColor }}>CONFIDENCE</span>
                <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: sigColor }}>{(result.confidence * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(result.confidence || 0) * 100}%`, background: sigColor, borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Reason */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 10 }}>SIGNAL REASON</div>
              <div style={{ fontFamily: C.sans, fontSize: 15, color: C.text, lineHeight: 1.6 }}>{result.reason || "No clear signal"}</div>
            </div>

            {/* Active indicators */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 14 }}>ACTIVE INDICATORS</div>
              {activeInds.map(ind => {
                const col = IND_COLORS[ind.trim()] || C.gold
                const DESC = { EMA: "Trend direction via crossover", RSI: "Momentum — overbought/oversold", MACD: "Entry confirmation crossover", BOLLINGER: "Volatility band extremes", STOCH: "Stochastic momentum", ATR: "Volatility filter", CCI: "Commodity channel index" }
                return (
                  <div key={ind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{ind.trim()}</span>
                    </div>
                    <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>{DESC[ind.trim()] || ""}</span>
                  </div>
                )
              })}
            </div>

            {/* Risk info if signal is not HOLD */}
            {result.signal !== "HOLD" && (
              <div style={{ background: result.signal === "BUY" ? C.greenDim : C.redDim, border: `1px solid ${result.signal === "BUY" ? C.green : C.red}30`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: result.signal === "BUY" ? C.green : C.red, letterSpacing: "0.12em", marginBottom: 10 }}>RISK MANAGEMENT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    ["Stop loss",   (activeStrat?.custom_params?.sl_pips   || 15)  + " pips"],
                    ["Take profit", (activeStrat?.custom_params?.tp_pips   || 30)  + " pips"],
                    ["Risk",        (activeStrat?.custom_params?.risk_per_trade || 1) + "% per trade"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 4 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.text }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// BACKTEST
function Backtest({ userPlan = 'free' }) {
  const [result,        setResult]        = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [asset,         setAsset]         = useState("XAUUSD")
  const [timeframe,     setTimeframe]     = useState("M5")
  const [myStrategies,  setMyStrategies]  = useState([])
  const [libStrategies, setLibStrategies] = useState([])
  const [currentUser,        setBtUser]        = useState(null)
  const [selectedStrat, setSelectedStrat] = useState("")
  const [savedResults,  setSavedResults]  = useState([])

  useEffect(() => {
    api.get("/strategies/mine").then(r => setMyStrategies(r.data)).catch(() => {})
    api.get("/strategies/").then(r => setLibStrategies(r.data)).catch(() => {})
    api.get("/auth/me").then(r => setBtUser(r.data)).catch(() => {})
  }, [])

  const activeStrat = selectedStrat !== ""
    ? (String(selectedStrat).startsWith("lib_")
        ? (() => { const s = libStrategies.find(st => st.id === parseInt(selectedStrat.replace("lib_",""))); return s ? { id: "lib_"+s.id, custom_params: { ...s.default_params, strategy_name: s.name } } : null })()
        : myStrategies.find(s => s.id === parseInt(selectedStrat)))
    : null
  const activeInds  = activeStrat?.custom_params?.indicators
    ? (Array.isArray(activeStrat.custom_params.indicators)
        ? activeStrat.custom_params.indicators
        : activeStrat.custom_params.indicators.split(","))
    : ["EMA", "RSI", "MACD"]

  const IND_COLORS = { EMA: C.gold, RSI: C.blue, MACD: C.green, BOLLINGER: "#a78bfa", STOCH: C.red, ATR: "#f97316", CCI: "#06b6d4" }

  const run = async () => {
    setLoading(true)
    try {
      // Build params — always include strategy_name and strategy_id so backend can save
      const baseParams = activeStrat?.custom_params
        ? { ...activeStrat.custom_params }
        : { indicators: ["EMA","RSI","MACD"], ema_fast: 9, ema_mid: 21, ema_slow: 50, rsi_period: 14, rsi_buy: 30, rsi_sell: 70, macd_fast: 12, macd_slow: 26, macd_signal: 9, sl_pips: 15, tp_pips: 30, risk_per_trade: 1.0 }

      // Always stamp strategy_name and strategy_id
      const strategyName = activeStrat?.custom_params?.strategy_name || "Default"
      const strategyId   = String(selectedStrat).startsWith("lib_") ? null : (parseInt(selectedStrat) || null)
      const params = { ...baseParams, strategy_name: strategyName }

      const periods = userPlan === "free" ? 100 : userPlan === "pro" ? 500 : userPlan === "elite" ? 1000 : 2000
      const body = { asset, timeframe, params, strategy_id: strategyId, periods }
      const res  = await api.post("/signal/backtest", body)
      setResult(res.data)

      // Save to local session history
      setSavedResults(prev => [{
        ...res.data,
        strategy_name: strategyName,
        asset, timeframe,
        ran_at: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)])
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div>
      <SectionHeader title="Backtest" sub="Choose a strategy, asset and timeframe - test against historical data." />
      <div style={{ marginBottom: 16, padding: "10px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
          {userPlan === "free" ? "⚠ Free plan: 100 candles max" : userPlan === "pro" ? "✓ Pro: 500 candles" : userPlan === "elite" ? "✓ Elite: 1000 candles" : "✓ Platinum: 2000 candles"}
        </span>
        {userPlan === "free" && <button onClick={() => alert("Contact support@pesapips.com to upgrade")} style={{ ...btnGold, padding: "4px 10px", fontSize: 9 }}>Upgrade →</button>}
      </div>

      {/* Controls */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>

          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>STRATEGY</label>
            <select value={selectedStrat} onChange={e => setSelectedStrat(e.target.value)} style={inputStyle}>
              <option value="">— Default (EMA + RSI + MACD) —</option>
              {libStrategies.length > 0 && (
                <optgroup label="--- Strategy Library ---">
                  {libStrategies.map(s => {
                    const tierReq = s.default_params?.tier_required || "free"
                    const tierOrder = { free: 0, pro: 1, elite: 2, platinum: 3 }
                    const plan = (typeof lsUser !== 'undefined' ? lsUser : currentUser)?.subscription_plan || "free"
                    const locked = (tierOrder[plan] || 0) < (tierOrder[tierReq] || 0)
                    return (
                      <option key={"lib_"+s.id} value={"lib_"+s.id} disabled={locked}>
                        {locked ? "🔒 " : ""}{s.name} {locked ? "("+tierReq+")" : "· "+s.default_params?.timeframe}
                      </option>
                    )
                  })}
                </optgroup>
              )}
              {myStrategies.length > 0 && (
                <optgroup label="--- My Saved Strategies ---">
                  {myStrategies.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.custom_params?.strategy_name || "Unnamed"} · {s.asset} · {s.timeframe}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>ASSET</label>
            <select value={asset} onChange={e => setAsset(e.target.value)} style={inputStyle}>
              {["XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","BTCUSD","ETHUSD","USDCHF","AUDUSD","OIL","NASDAQ","DOW","SPX","DXY","USDKES"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>TIMEFRAME</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={inputStyle}>
              {["M1","M5","M15","M30","H1","H4","D1"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: "transparent", display: "block", marginBottom: 7 }}>·</label>
            <button onClick={run} disabled={loading} style={{ ...btnGold, opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
              {loading ? "Running..." : "Run backtest"}
            </button>
          </div>
        </div>

        {/* Strategy info strip */}
        {activeStrat && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: C.surface2, borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em" }}>TESTING:</span>
            <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>
              {activeStrat.custom_params?.strategy_name || "Unnamed"}
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {activeInds.map(ind => (
                <span key={ind} style={{
                  fontFamily: C.mono, fontSize: 9, padding: "2px 8px", borderRadius: 4,
                  background: `${IND_COLORS[ind.trim()] || C.gold}18`,
                  color: IND_COLORS[ind.trim()] || C.gold,
                  border: `1px solid ${IND_COLORS[ind.trim()] || C.gold}35`,
                }}>{ind.trim()}</span>
              ))}
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginLeft: "auto" }}>
              SL {activeStrat.custom_params?.sl_pips || 15}p · TP {activeStrat.custom_params?.tp_pips || 30}p · Risk {activeStrat.custom_params?.risk_per_trade || 1}%
            </span>
          </div>
        )}
      </div>

      {/* Current result */}
      {result && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 14 }}>
            RESULT — {activeStrat?.custom_params?.strategy_name || "Default"} · {asset} · {timeframe}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
            <StatCard label="Total trades"   value={result.total_trades}                               color={C.blue}  />
            <StatCard label="Win rate"        value={result.winrate_pct + "%"}                          color={result.winrate_pct >= 50 ? C.green : C.red} />
            <StatCard label="Total PnL"       value={"$" + result.total_pnl}                           color={result.total_pnl >= 0 ? C.green : C.red} />
            <StatCard label="Profit factor"   value={result.profit_factor}                              color={result.profit_factor >= 1 ? C.green : C.red} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Max drawdown"   value={result.max_drawdown_pct + "%"}                     color={C.red}   />
            <StatCard label="Winning trades" value={result.winning_trades}                              color={C.green} />
            <StatCard label="Losing trades"  value={result.losing_trades}                               color={C.red}   />
            <StatCard label="Return"         value={result.return_pct + "%"}                            color={result.return_pct >= 0 ? C.green : C.red} />
          </div>

          {/* Win rate bar */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em" }}>WIN RATE</span>
              <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: result.winrate_pct >= 50 ? C.green : C.red }}>{result.winrate_pct}%</span>
            </div>
            <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.winrate_pct}%`, background: result.winrate_pct >= 50 ? C.green : C.red, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* Run history */}
      {savedResults.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>RUN HISTORY (this session)</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 90px 80px 70px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
            {["Strategy","Asset","TF","Trades","Win Rate","PnL","Time"].map(h => (
              <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em" }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {savedResults.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 90px 80px 70px", padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.text }}>{r.strategy_name}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text2 }}>{r.asset}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text2 }}>{r.timeframe}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text2 }}>{r.total_trades}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: r.winrate_pct >= 50 ? C.green : C.red }}>{r.winrate_pct}%</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: r.total_pnl >= 0 ? C.green : C.red }}>${r.total_pnl}</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{r.ran_at}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// TRADE HISTORY
function AdjustTradeModal({ trade, onClose, onSave }) {
  const [sl, setSl] = useState(trade.sl || "")
  const [tp, setTp] = useState(trade.tp || "")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  const handleSave = async () => {
    setLoading(true)
    try {
      // Placeholder — will wire to MT5 bridge when connected
      await new Promise(r => setTimeout(r, 600))
      setMsg("SL/TP updated successfully.")
      setTimeout(() => { onSave(); onClose() }, 800)
    } catch { setMsg("Failed to update. Check MT5 connection.") }
    finally { setLoading(false) }
  }

  const handleClose = async () => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      setMsg("Trade close order sent.")
      setTimeout(() => { onSave(); onClose() }, 800)
    } catch { setMsg("Failed to close trade.") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "28px", width: 380, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: C.display, fontSize: 20, color: C.text }}>Adjust Trade</div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, marginTop: 2 }}>{trade.symbol} · {trade.trade_type} · {trade.lot} lots</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {msg && <div style={{ background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: C.sans, fontSize: 13, color: C.green }}>{msg}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>ENTRY PRICE</label>
            <div style={{ ...inputStyle, color: C.text3, cursor: "not-allowed" }}>{trade.entry_price?.toFixed(2) || "—"}</div>
          </div>
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>CURRENT P&L</label>
            <div style={{ ...inputStyle, color: trade.profit >= 0 ? C.green : C.red, fontWeight: 700 }}>{trade.profit >= 0 ? "+" : ""}{"$"}{trade.profit?.toFixed(2) || "0.00"}</div>
          </div>
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.red, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>STOP LOSS</label>
            <input type="number" value={sl} onChange={e => setSl(e.target.value)} step="0.01"
              style={{ ...inputStyle }}
              onFocus={e => e.target.style.borderColor = C.red}
              onBlur={e => e.target.style.borderColor = C.border2}
            />
          </div>
          <div>
            <label style={{ fontFamily: C.mono, fontSize: 9, color: C.green, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>TAKE PROFIT</label>
            <input type="number" value={tp} onChange={e => setTp(e.target.value)} step="0.01"
              style={{ ...inputStyle }}
              onFocus={e => e.target.style.borderColor = C.green}
              onBlur={e => e.target.style.borderColor = C.border2}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={loading} style={{ ...btnGold, flex: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Saving..." : "Update SL/TP"}
          </button>
          <button onClick={handleClose} disabled={loading} style={{ ...btnOutline, flex: 1, color: C.red, borderColor: `${C.red}50` }}>
            Close Trade
          </button>
        </div>

        <div style={{ marginTop: 14, padding: "10px 14px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 8 }}>
          <p style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            ⚠ SL/TP adjustments and manual close will execute via MT5 once your broker account is connected.
          </p>
        </div>
      </div>
    </div>
  )
}


// LIVE POSITIONS (shared — used in Overview + TradeHistory)
function LivePositions({ compact = false, onAdjust, onRefresh, trades, loading }) {
  // Accept both DB trades (have status field) and MT5 positions (no status = always open)
  const liveTrades = (trades || []).filter(t => !t.status || t.status === "open")
  const totalFloat = liveTrades.reduce((s, t) => s + (t.profit || 0), 0)
  const COL = compact
    ? "1fr 70px 70px 90px 80px 100px"
    : "1fr 80px 70px 100px 100px 90px 90px 120px"

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: compact ? 0 : 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text }}>Live Positions</span>
          <Badge label={`${liveTrades.length} OPEN`} color={C.green} dim={C.greenDim} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: totalFloat >= 0 ? C.green : C.red }}>
            Float: {totalFloat >= 0 ? "+" : ""}{"$"}{totalFloat.toFixed(2)}
          </span>
          {onRefresh && (
            <button onClick={onRefresh} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4, transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = C.gold}
              onMouseLeave={e => e.target.style.color = C.text3}
            >↻</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "32px", fontFamily: C.sans, fontSize: 13, color: C.text3 }}>Loading positions...</div>
      ) : liveTrades.length === 0 ? (
        <div style={{ textAlign: "center", padding: compact ? "24px 0" : "40px 0" }}>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◎</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No open positions</div>
          {!compact && <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, opacity: 0.6, marginTop: 4 }}>Positions opened by the AI engine appear here in real time.</div>}
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: COL, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
            {(compact
              ? ["Symbol","Type","Lot","Entry","P&L","Actions"]
              : ["Symbol","Type","Lot","Entry","Exit","P&L","Status","Actions"]
            ).map(h => (
              <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em" }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {/* Rows */}
          {liveTrades.map(t => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: COL, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.text }}>{t.symbol}</div>
              <div><Badge label={t.trade_type} color={t.trade_type === "BUY" ? C.green : C.red} dim={t.trade_type === "BUY" ? C.greenDim : C.redDim} /></div>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{t.lot}</div>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{t.entry_price?.toFixed(2) || "—"}</div>
              {!compact && <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>—</div>}
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: (t.profit||0) >= 0 ? C.green : C.red }}>
                {(t.profit||0) >= 0 ? "+" : ""}{"$"}{(t.profit||0).toFixed(2)}
              </div>
              {!compact && <div><Badge label="LIVE" color={C.green} dim={C.greenDim} /></div>}
              <div style={{ display: "flex", gap: 6 }}>
                {onAdjust && (
                  <button onClick={() => onAdjust(t)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.text2, fontFamily: C.mono, fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}
                  >Adjust</button>
                )}
                <button onClick={async () => {
                  if (!window.confirm("Close this position?")) return
                  try { await api.post(`/trading/close/${t.id}`); onRefresh && onRefresh() } catch {}
                }} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.red}40`, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.redDim}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >Close</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function TradeHistory() {
  const [trades,      setTrades]      = useState([])
  const [mt5Pos,      setMt5Pos]      = useState([])
  const [mt5History,  setMt5History]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [adjustTrade, setAdjustTrade] = useState(null)
  const [livePage,    setLivePage]    = useState(1)
  const [closedPage,  setClosedPage]  = useState(1)
  const [livePerPage, setLivePerPage] = useState(10)
  const [closedPerPage, setClosedPerPage] = useState(10)

  const loadTrades = () => {
    setLoading(true)
    Promise.all([
      api.get("/dashboard/trades?limit=200"),
      api.get("/trading/positions"),
      api.get("/trading/history"),
    ]).then(([dbRes, posRes, histRes]) => {
      setTrades(dbRes.data || [])
      const positions = posRes.data?.positions || []
      setMt5Pos(positions.map(p => ({
        id: p.ticket,
        symbol: p.symbol,
        asset: p.symbol,
        trade_type: p.type,
        lot: p.volume,
        volume: p.volume,
        entry_price: p.open_price,
        current_price: p.current_price,
        profit: p.profit,
        swap: p.swap,
        sl: p.sl,
        tp: p.tp,
        status: "open",
        opened_at: new Date(p.open_time * 1000).toISOString(),
      })))
      // Also store MT5 history for closed trades
      const deals = histRes.data?.deals || []
      const mt5Closed = deals.map(d => ({
        id: d.ticket,
        symbol: d.symbol,
        asset: d.symbol,
        trade_type: d.type,
        lot: d.volume,
        volume: d.volume,
        entry_price: d.price,
        exit_price: d.price,
        profit: d.profit,
        status: "closed",
        closed_at: new Date(d.time * 1000).toISOString(),
      }))
      setMt5History(mt5Closed)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }

  useEffect(() => { loadTrades() }, [])
  useEffect(() => {
    const id = setInterval(loadTrades, 10000)
    return () => clearInterval(id)
  }, [])

  const liveTrades   = mt5Pos.length > 0 ? mt5Pos : trades.filter(t => t.status === "open")
  const closedTrades = mt5History.length > 0 ? mt5History : trades.filter(t => t.status !== "open")

  const paginate = (arr, page, perPage) => {
    const start = (page - 1) * perPage
    return arr.slice(start, start + perPage)
  }

  const totalPages = (arr, perPage) => Math.max(1, Math.ceil(arr.length / perPage))

  const COL = "1fr 80px 70px 100px 100px 90px 90px 120px"

  const TableHeader = ({ showActions }) => (
    <div style={{ display: "grid", gridTemplateColumns: showActions ? COL : "1fr 80px 70px 100px 100px 90px 90px 100px", padding: "11px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
      {["Symbol","Type","Lot","Entry","Exit","P&L","Status", showActions ? "Actions" : "Closed"].map(h => (
        <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em" }}>{h.toUpperCase()}</div>
      ))}
    </div>
  )

  const Pagination = ({ page, setPage, total, perPage, setPerPage, label }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>ROWS:</span>
        {[5,10,25].map(n => (
          <button key={n} onClick={() => { setPerPage(n); setPage(1) }} style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 10, background: perPage === n ? C.gold : C.surface3, color: perPage === n ? "#000" : C.text3 }}>{n}</button>
        ))}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
        {label} · page {page} of {totalPages([], perPage) || 1}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: page === 1 ? C.text3 : C.text, cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: C.mono, fontSize: 11 }}>←</button>
        <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page >= total}
          style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: page >= total ? C.text3 : C.text, cursor: page >= total ? "not-allowed" : "pointer", fontFamily: C.mono, fontSize: 11 }}>→</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <SectionHeader title="Trade History" sub="Live positions and closed trade log from the AI engine." />
        <button onClick={loadTrades} style={{ ...btnOutline, padding: "9px 16px", fontSize: 13 }}>↻ Refresh</button>
      </div>

      {adjustTrade && (
        <AdjustTradeModal
          trade={adjustTrade}
          onClose={() => setAdjustTrade(null)}
          onSave={loadTrades}
        />
      )}

      {/* ── LIVE TRADES ── */}
      <LivePositions
        trades={liveTrades}
        loading={loading}
        onAdjust={setAdjustTrade}
        onRefresh={loadTrades}
      />
      {false && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setAdjustTrade(t)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "transparent", color: C.text2, fontFamily: C.mono, fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}
                  >Adjust</button>
                  <button onClick={() => setAdjustTrade(t)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.red}40`, background: C.redDim, color: C.red, fontFamily: C.mono, fontSize: 10, cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >Close</button>
                </div>
)}
      {/* ── CLOSED TRADES ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 600, color: C.text }}>Closed Trades</span>
            <Badge label={`${closedTrades.length} TRADES`} color={C.text3} dim="rgba(90,96,112,0.1)" />
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 2 }}>TOTAL REALISED</div>
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: closedTrades.reduce((s,t) => s + (t.profit||0), 0) >= 0 ? C.green : C.red }}>
                {closedTrades.reduce((s,t) => s + (t.profit||0), 0) >= 0 ? "+" : ""}{"$"}{closedTrades.reduce((s,t) => s + (t.profit||0), 0).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 2 }}>WIN RATE</div>
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.gold }}>
                {closedTrades.length > 0 ? (closedTrades.filter(t => (t.profit||0) > 0).length / closedTrades.length * 100).toFixed(1) : "0"}%
              </div>
            </div>
          </div>
        </div>

        {closedTrades.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◇</div>
            <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>No closed trades yet.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 100px 100px 90px 90px 100px", padding: "11px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
              {["Symbol","Type","Lot","Entry","Exit","P&L","Result","Closed"].map(h => (
                <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em" }}>{h.toUpperCase()}</div>
              ))}
            </div>
            {paginate(closedTrades, closedPage, closedPerPage).map(t => {
              const won = (t.profit||0) > 0
              return (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 100px 100px 90px 90px 100px", padding: "13px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.text }}>{t.symbol}</div>
                  <div><Badge label={t.trade_type} color={t.trade_type === "BUY" ? C.green : C.red} dim={t.trade_type === "BUY" ? C.greenDim : C.redDim} /></div>
                  <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{t.lot}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{t.entry_price?.toFixed(2) || "—"}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{t.exit_price?.toFixed(2)  || "—"}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: won ? C.green : C.red }}>{(t.profit||0) >= 0 ? "+" : ""}{"$"}{(t.profit||0).toFixed(2)}</div>
                  <div><Badge label={won ? "WIN" : "LOSS"} color={won ? C.green : C.red} dim={won ? C.greenDim : C.redDim} /></div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
                    {t.closed_at ? new Date(t.closed_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              )
            })}
            <Pagination page={closedPage} setPage={setClosedPage} total={totalPages(closedTrades, closedPerPage)} perPage={closedPerPage} setPerPage={setClosedPerPage} label={`${closedTrades.length} trades`} />
          </>
        )}
      </div>
    </div>
  )
}

// PERFORMANCE
function Performance({ summary, userPlan = 'free' }) {
  const [trades,      setTrades]      = useState([])
  const [myStrategies,setMyStrategies]= useState([])
  const [selected,    setSelected]    = useState("all")
  const [perfTab,     setPerfTab]     = useState("live")

  useEffect(() => {
    api.get("/dashboard/trades?limit=500").then(r => setTrades(r.data)).catch(() => {})
    api.get("/strategies/mine").then(r => setMyStrategies(r.data)).catch(() => {})
  }, [])

  const calcMetrics = tradeList => {
    const total  = tradeList.length
    const wins   = tradeList.filter(t => (t.profit || 0) > 0)
    const losses = tradeList.filter(t => (t.profit || 0) <= 0)
    const pnl    = tradeList.reduce((acc, t) => acc + (t.profit || 0), 0)
    const winrate = total > 0 ? (wins.length / total * 100) : 0
    const grossProfit = wins.reduce((acc,t) => acc + (t.profit||0), 0)
    const grossLoss   = Math.abs(losses.reduce((acc,t) => acc + (t.profit||0), 0))
    const pf = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 999 : 0
    let peak = 0, running = 0, maxDD = 0
    tradeList.forEach(t => {
      running += t.profit || 0
      peak = Math.max(peak, running)
      maxDD = Math.max(maxDD, peak > 0 ? (peak - running) / peak * 100 : 0)
    })
    return { total, wins: wins.length, losses: losses.length, pnl, winrate, pf, maxDD }
  }

  // Group live trades by strategy name
  const groups = { all: trades }
  trades.forEach(t => {
    const key = t.strategy_name || "Default"
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  const strategyKeys = Object.keys(groups).filter(k => k !== "all")
  const displayTrades = selected === "all" ? trades : (groups[selected] || [])
  const m = calcMetrics(displayTrades)

  // Backtest tab — pull saved backtest results from strategies
  const backtestRows = myStrategies
    .filter(s => s.backtest_result)
    .map(s => ({ ...s.backtest_result, strategy_name: s.custom_params?.strategy_name || "Unnamed", asset: s.asset, timeframe: s.timeframe }))

  return (
    <div>
      <SectionHeader title="Performance" sub="Analyse your strategies - backtest results vs live market performance." />

      {/* Free tier — limited stats only */}
      {!canAccess(userPlan, "pro") && (
        <div>
          <div style={{ marginBottom: 16, padding: "12px 18px", background: C.goldDim, border: "1px solid rgba(212,168,67,0.2)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 3 }}>FREE PLAN — LIMITED VIEW</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>Upgrade to Pro for full strategy analytics, equity curves and detailed breakdown.</div>
            </div>
            <button onClick={() => alert("Contact support@pesapips.com to upgrade")} style={{ padding: "6px 14px", background: C.gold, border: "none", borderRadius: 6, fontFamily: C.mono, fontSize: 9, color: "#000", fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 16 }}>Upgrade</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Trades", value: String(summary?.total_trades || 0), color: C.blue },
              { label: "Win Rate",     value: String(((summary?.winning_trades||0) / Math.max(summary?.total_trades||1,1) * 100).toFixed(1)) + "%", color: C.green },
              { label: "Total P&L",   value: "$" + String((summary?.daily_pnl||0).toFixed(2)), color: (summary?.daily_pnl||0) >= 0 ? C.green : C.red },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 10 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: C.display, fontSize: 28, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <TierGate required="pro" userPlan={userPlan} feature="Full Performance Analytics" />
        </div>
      )}

      {/* Pro+ full view */}
      {canAccess(userPlan, "pro") && (
      <div>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>

        {[
          { id: "live",     label: "Live performance" },
          { id: "backtest", label: "Backtest results"  },
        ].map(t => (
          <button key={t.id} onClick={() => setPerfTab(t.id)} style={{
            padding: "11px 22px", background: "transparent", border: "none",
            borderBottom: perfTab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: perfTab === t.id ? 600 : 400,
            color: perfTab === t.id ? C.gold : C.text3, cursor: "pointer", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
        </div>

      {/* LIVE PERFORMANCE TAB */}
      {perfTab === "live" && (
        <div>
          {/* Strategy filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["all", ...strategyKeys].map(key => (
              <button key={key} onClick={() => setSelected(key)} style={{
                padding: "6px 14px", borderRadius: 20, border: `1px solid ${selected === key ? C.gold : C.border}`,
                cursor: "pointer", fontFamily: C.sans, fontSize: 12,
                fontWeight: selected === key ? 600 : 400,
                background: selected === key ? C.goldDim : C.surface2,
                color: selected === key ? C.gold : C.text2, transition: "all 0.15s",
              }}>
                {key === "all" ? "All strategies" : key}
                <span style={{ fontFamily: C.mono, fontSize: 10, marginLeft: 5, opacity: 0.6 }}>
                  ({key === "all" ? trades.length : (groups[key]?.length || 0)})
                </span>
              </button>
            ))}
          </div>

          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            <StatCard label="Total trades"  value={m.total}                      color={C.blue}  />
            <StatCard label="Win rate"       value={m.winrate.toFixed(1) + "%"}   color={m.winrate >= 50 ? C.green : C.red} />
            <StatCard label="Total PnL"      value={"$" + m.pnl.toFixed(2)}      color={m.pnl >= 0 ? C.green : C.red} />
            <StatCard label="Profit factor"  value={m.pf.toFixed(2)}              color={m.pf >= 1 ? C.green : C.red} />
            <StatCard label="Wins"           value={m.wins}                        color={C.green} />
            <StatCard label="Max drawdown"   value={m.maxDD.toFixed(1) + "%"}     color={C.red}   />
          </div>

          {/* Win rate bar */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em" }}>
                WIN RATE · {selected === "all" ? "ALL STRATEGIES" : selected.toUpperCase()}
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: m.winrate >= 50 ? C.green : C.red }}>{m.winrate.toFixed(1)}%</span>
            </div>
            <div style={{ height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${m.winrate}%`, background: m.winrate >= 50 ? C.green : C.red, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
          </div>

          {/* Strategy comparison table */}
          {strategyKeys.length > 1 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>STRATEGY COMPARISON — LIVE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 70px 90px 80px 80px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                {["Strategy","Trades","Wins","PnL","Win Rate","Prof. F"].map(h => (
                  <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em" }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {strategyKeys.map(key => {
                const m2 = calcMetrics(groups[key] || [])
                return (
                  <div key={key} onClick={() => setSelected(key)} style={{
                    display: "grid", gridTemplateColumns: "1.5fr 70px 70px 90px 80px 80px",
                    padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", background: selected === key ? C.goldDim : "transparent",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = selected === key ? C.goldDim : "transparent"}
                  >
                    <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>{key}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{m2.total}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, color: C.green }}>{m2.wins}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: m2.pnl >= 0 ? C.green : C.red }}>{m2.pnl >= 0 ? "+" : ""}{"$"}{m2.pnl.toFixed(2)}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, color: m2.winrate >= 50 ? C.green : C.red }}>{m2.winrate.toFixed(1)}%</div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, color: m2.pf >= 1 ? C.green : C.red }}>{m2.pf.toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {trades.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>▣</div>
              <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>No live trades yet. Performance metrics appear once you start trading.</div>
            </div>
          )}
        </div>
      )}

      {/* BACKTEST TAB */}
      {perfTab === "backtest" && (
        <div>
          {backtestRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>◇</div>
              <div style={{ fontFamily: C.sans, fontSize: 15, color: C.text3, marginBottom: 8 }}>No backtest results saved yet.</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, opacity: 0.6 }}>Run a backtest from the Backtest tab - results will appear here per strategy.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {backtestRows.map((r, i) => (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: C.display, fontSize: 17, color: C.text, marginBottom: 3 }}>{r.strategy_name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{r.asset}  ·  {r.timeframe}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 20,
                      background: r.total_pnl >= 0 ? C.greenDim : C.redDim,
                      border: `1px solid ${r.total_pnl >= 0 ? C.green : C.red}30` }}>
                      <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: r.total_pnl >= 0 ? C.green : C.red }}>
                        {r.total_pnl >= 0 ? "+" : ""}{"$"}{r.total_pnl}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      ["Trades",       r.total_trades,           C.blue  ],
                      ["Win rate",     r.winrate_pct + "%",       r.winrate_pct >= 50 ? C.green : C.red],
                      ["Profit factor",r.profit_factor,           r.profit_factor >= 1 ? C.green : C.red],
                      ["Max drawdown", r.max_drawdown_pct + "%",  C.red   ],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 4 }}>{label.toUpperCase()}</div>
                        <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
      )}
    </div>
  )
}
// LEARNING HUB
// SIMPLE MARKDOWN RENDERER
function renderMarkdown(text) {
  if (!text) return ""
  const h2 = '<h2 style="font-size:16px;font-weight:600;color:#e8e8ec;margin:18px 0 8px">'
  const h3 = '<h3 style="font-size:14px;font-weight:600;color:#e8e8ec;margin:14px 0 6px">'
  return text
    .replace(new RegExp("^## (.+)$", "gm"), h2 + "$1</h2>")
    .replace(new RegExp("^### (.+)$", "gm"), h3 + "$1</h3>")
    .replace(new RegExp("[*][*](.+?)[*][*]", "g"), '<strong style="color:#e8e8ec">$1</strong>')
    .replace(new RegExp("[*](.+?)[*]", "g"), "<em>$1</em>")
    .replace(new RegExp("^- (.+)$", "gm"), '<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:#d4a843;flex-shrink:0">·</span><span>$1</span></div>')
    .replace(new RegExp("^([0-9]+)[.] (.+)$", "gm"), '<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:#d4a843;font-family:monospace;flex-shrink:0">$1.</span><span>$2</span></div>')
    .replace(new RegExp("\\n\\n", "g"), '<div style="height:10px"></div>')
    .replace(new RegExp("\\n", "g"), "<br/>")
}

// LEARNING HUB
function LearningHub() {
  const [modules,      setModules]      = useState([])
  const [summary,      setSummary]      = useState(null)
  const [activeModule, setActiveModule] = useState(null)
  const [lessons,      setLessons]      = useState([])
  const [activeLesson, setActiveLesson] = useState(null)
  const [quizzes,      setQuizzes]      = useState([])
  const [quizAnswers,  setQuizAnswers]  = useState({})
  const [quizResults,  setQuizResults]  = useState({})
  const [completing,   setCompleting]   = useState(false)
  const [track,        setTrack]        = useState("basics")
  const [toast,        setToast]        = useState("")
  const [loading,      setLoading]      = useState(true)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  useEffect(() => {
    Promise.all([
      api.get("/courses/"),
      api.get("/courses/progress/summary"),
    ]).then(([mr, sr]) => {
      setModules(mr.data)
      setSummary(sr.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openModule = async (mod) => {
    if (mod.locked) { showToast(`Upgrade to ${mod.tier_required.toUpperCase()} to unlock this module`); return }
    setActiveModule(mod)
    setActiveLesson(null)
    setQuizzes([])
    try {
      const r = await api.get(`/courses/${mod.id}/lessons`)
      setLessons(r.data)
    } catch {}
  }

  const openLesson = async (lesson) => {
    setActiveLesson(lesson)
    setQuizAnswers({})
    setQuizResults({})
    try {
      const r = await api.get(`/courses/${activeModule.id}/lessons/${lesson.id}/quizzes`)
      setQuizzes(r.data)
    } catch { setQuizzes([]) }
  }

  const markComplete = async () => {
    if (!activeLesson || activeLesson.completed) return
    setCompleting(true)
    try {
      const r = await api.post(`/courses/complete/${activeLesson.id}`)
      showToast(`+${r.data.points_earned} points earned! Total: ${r.data.total_points}`)
      setActiveLesson(p => ({ ...p, completed: true }))
      setLessons(p => p.map(l => l.id === activeLesson.id ? { ...l, completed: true } : l))
      setSummary(p => p ? { ...p, points_balance: r.data.total_points, completed_lessons: (p.completed_lessons || 0) + 1 } : p)
    } catch {}
    finally { setCompleting(false) }
  }

  const submitQuiz = async (quizId) => {
    const answer = quizAnswers[quizId]
    if (answer === undefined) { showToast("Select an answer first"); return }
    try {
      const r = await api.post("/courses/quiz/submit", { lesson_id: activeLesson.id, quiz_id: quizId, answer })
      setQuizResults(p => ({ ...p, [quizId]: r.data }))
      if (r.data.correct) {
        showToast(`Correct! +${r.data.points_earned} points`)
        setSummary(p => p ? { ...p, points_balance: r.data.total_points } : p)
      }
      else showToast("Incorrect — check the explanation below")
    } catch {}
  }

  const redeemPoints = async (tier, cost) => {
    try {
      const r = await api.post("/courses/redeem", { points: cost, target_tier: tier })
      showToast(r.data.message)
      setSummary(p => p ? { ...p, points_balance: r.data.points_remaining, trial_active: true } : p)
    } catch (err) {
      showToast(err.response?.data?.detail || "Redemption failed")
    }
  }

  const filteredModules = modules.filter(m => m.track === track)
  const progressPct = summary?.progress_pct || 0

  // LESSON VIEW
  if (activeLesson) {
    const lessonIdx  = lessons.findIndex(l => l.id === activeLesson.id)
    const nextLesson = lessons[lessonIdx + 1] || null
    const prevLesson = lessons[lessonIdx - 1] || null

    return (
      <div>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
          <button onClick={() => { setActiveLesson(null); setQuizzes([]) }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontFamily: C.mono, fontSize: 11 }}
            onMouseEnter={e => e.target.style.color = C.gold}
            onMouseLeave={e => e.target.style.color = C.text3}
          >Learning Hub</button>
          <span>›</span>
          <button onClick={() => setActiveLesson(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontFamily: C.mono, fontSize: 11 }}
            onMouseEnter={e => e.target.style.color = C.gold}
            onMouseLeave={e => e.target.style.color = C.text3}
          >{activeModule?.title}</button>
          <span>›</span>
          <span style={{ color: C.text2 }}>{activeLesson.title}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
          {/* Lesson content */}
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 8 }}>
                    LESSON {lessonIdx + 1} OF {lessons.length} · {activeLesson.duration || "—"}
                  </div>
                  <div style={{ fontFamily: C.display, fontSize: 22, color: C.text, letterSpacing: 1 }}>{activeLesson.title}</div>
                </div>
                {activeLesson.completed && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 20 }}>
                    <span style={{ color: C.green, fontSize: 12 }}>✓</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green }}>COMPLETED</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content || "Content coming soon.") }}
              />
            </div>

            {/* Quizzes */}
            {quizzes.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>QUIZ — TEST YOUR KNOWLEDGE</div>
                {quizzes.map((q, qi) => {
                  const result = quizResults[q.id]
                  const answered = result !== undefined
                  return (
                    <div key={q.id} style={{ marginBottom: 28, paddingBottom: 24, borderBottom: qi < quizzes.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
                        Q{qi + 1}. {q.question}
                        <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, marginLeft: 8 }}>+{q.points_awarded} pts</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        {q.options.map((opt, oi) => {
                          let bg = C.surface2, border = C.border2, color = C.text2
                          if (answered) {
                            if (oi === result.correct_answer) { bg = C.greenDim; border = C.green; color = C.green }
                            else if (oi === quizAnswers[q.id] && !result.correct) { bg = C.redDim; border = C.red; color = C.red }
                          } else if (quizAnswers[q.id] === oi) {
                            bg = C.goldDim; border = C.gold; color = C.gold
                          }
                          return (
                            <div key={oi} onClick={() => !answered && setQuizAnswers(p => ({ ...p, [q.id]: oi }))}
                              style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color, fontFamily: C.sans, fontSize: 13, cursor: answered ? "default" : "pointer", transition: "all 0.15s" }}>
                              <span style={{ fontFamily: C.mono, fontSize: 10, marginRight: 8, opacity: 0.6 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                            </div>
                          )
                        })}
                      </div>
                      {!answered ? (
                        <button onClick={() => submitQuiz(q.id)} style={{ ...btnGold, padding: "7px 16px", fontSize: 12 }}>Submit answer</button>
                      ) : result.explanation ? (
                        <div style={{ padding: "10px 14px", background: C.surface2, borderRadius: 8, fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                          <span style={{ color: C.gold, fontFamily: C.mono, fontSize: 9 }}>EXPLANATION · </span>{result.explanation}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => prevLesson && openLesson(prevLesson)} disabled={!prevLesson}
                style={{ ...btnOutline, opacity: prevLesson ? 1 : 0.3 }}>← Previous</button>
              <button onClick={markComplete} disabled={activeLesson.completed || completing}
                style={{ ...btnGold, opacity: activeLesson.completed ? 0.5 : 1 }}>
                {activeLesson.completed ? "✓ Completed" : completing ? "Saving..." : "Mark complete (+5 pts)"}
              </button>
              <button onClick={() => nextLesson ? openLesson(nextLesson) : setActiveLesson(null)} 
                style={{ ...btnOutline }}>
                {nextLesson ? "Next →" : "Back to module"}
              </button>
            </div>
          </div>

          {/* Sidebar — lesson list */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px", height: "fit-content", position: "sticky", top: 20 }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 14 }}>MODULE LESSONS</div>
            {lessons.map((l, i) => (
              <div key={l.id} onClick={() => openLesson(l)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: activeLesson?.id === l.id ? C.goldDim : "transparent", border: `1px solid ${activeLesson?.id === l.id ? C.gold + "40" : "transparent"}`, transition: "all 0.15s" }}
                onMouseEnter={e => { if (activeLesson?.id !== l.id) e.currentTarget.style.background = C.surface2 }}
                onMouseLeave={e => { if (activeLesson?.id !== l.id) e.currentTarget.style.background = "transparent" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${l.completed ? C.green : activeLesson?.id === l.id ? C.gold : C.border2}`, background: l.completed ? C.greenDim : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {l.completed && <span style={{ color: C.green, fontSize: 10 }}>✓</span>}
                  {!l.completed && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.sans, fontSize: 12, color: activeLesson?.id === l.id ? C.gold : C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                  {l.duration && <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{l.duration}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, borderRadius: 8, fontWeight: 500, zIndex: 999 }}>{toast}</div>}
      </div>
    )
  }

  // MODULE VIEW
  if (activeModule) {
    const completedCount = lessons.filter(l => l.completed).length
    const pct = lessons.length > 0 ? Math.round(completedCount / lessons.length * 100) : 0

    return (
      <div>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
          <button onClick={() => setActiveModule(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontFamily: C.mono, fontSize: 11 }}
            onMouseEnter={e => e.target.style.color = C.gold}
            onMouseLeave={e => e.target.style.color = C.text3}
          >Learning Hub</button>
          <span>›</span>
          <span style={{ color: C.text2 }}>{activeModule.title}</span>
        </div>

        {/* Module header */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: activeModule.track === "basics" ? C.green : C.gold, letterSpacing: "0.14em", marginBottom: 8 }}>
                {activeModule.track.toUpperCase()} · {activeModule.tier_required.toUpperCase()}
              </div>
              <div style={{ fontFamily: C.display, fontSize: 22, color: C.text, letterSpacing: 1, marginBottom: 6 }}>{activeModule.title}</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>{activeModule.description}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
              <div style={{ fontFamily: C.display, fontSize: 28, color: pct === 100 ? C.green : C.gold }}>{pct}%</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{completedCount}/{lessons.length} done</div>
            </div>
          </div>
          <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.green : C.gold, borderRadius: 3, transition: "width 0.8s ease" }} />
          </div>
        </div>

        {/* Lesson list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lessons.map((l, i) => (
            <div key={l.id} onClick={() => openLesson(l)}
              style={{ background: C.surface, border: `1px solid ${l.completed ? C.green + "30" : C.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.gold + "50"}
              onMouseLeave={e => e.currentTarget.style.borderColor = l.completed ? C.green + "30" : C.border}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${l.completed ? C.green : C.border2}`, background: l.completed ? C.greenDim : C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {l.completed
                  ? <span style={{ color: C.green, fontSize: 14 }}>✓</span>
                  : <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{l.title}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {l.duration && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{l.duration} read</span>}
                  {l.quiz_count > 0 && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.gold }}>{l.quiz_count} quiz question{l.quiz_count > 1 ? "s" : ""}</span>}
                  {l.completed && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green }}>COMPLETED</span>}
                </div>
              </div>
              <span style={{ color: C.text3, fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
        {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, borderRadius: 8, fontWeight: 500, zIndex: 999 }}>{toast}</div>}
      </div>
    )
  }

  // MAIN HUB VIEW
  return (
    <div>
      <SectionHeader title="Learning Hub" sub="Learn, complete courses, earn points and unlock features." />

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading courses...</div>
      ) : (
        <>
          {/* Progress + Points bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 10 }}>OVERALL PROGRESS</div>
              <div style={{ fontFamily: C.display, fontSize: 24, color: C.gold, marginBottom: 8 }}>{progressPct}%</div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: C.gold, borderRadius: 3, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 6 }}>{summary?.completed_lessons || 0} / {summary?.total_lessons || 0} lessons</div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 8 }}>POINTS BALANCE</div>
              <div style={{ fontFamily: C.display, fontSize: 28, color: C.gold }}>{summary?.points_balance || 0}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 4 }}>Earn by completing lessons + quizzes</div>
              {summary?.trial_active && (
                <div style={{ marginTop: 8, padding: "4px 8px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 6, fontFamily: C.mono, fontSize: 9, color: C.green }}>
                  TRIAL ACTIVE
                </div>
              )}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 10 }}>REDEEM POINTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { tier: "pro",   label: "Pro trial",   cost: 100, days: 7  },
                  { tier: "elite", label: "Elite trial",  cost: 200, days: 3  },
                ].map(r => (
                  <div key={r.tier} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{r.label} ({r.days}d)</span>
                    <button onClick={() => redeemPoints(r.tier, r.cost)}
                      disabled={(summary?.points_balance || 0) < r.cost}
                      style={{ ...btnGold, padding: "4px 10px", fontSize: 10, opacity: (summary?.points_balance || 0) < r.cost ? 0.4 : 1 }}>
                      {r.cost} pts
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Track tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
            {[{ id: "basics", label: "Basics — Free" }, { id: "coursework", label: "Coursework — Pro+" }].map(t => (
              <button key={t.id} onClick={() => setTrack(t.id)} style={{
                flex: 1, padding: "9px 14px", background: track === t.id ? C.gold : "transparent",
                border: "none", borderRadius: 7, fontFamily: C.mono, fontSize: 10,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: track === t.id ? "#000" : C.text3,
                fontWeight: track === t.id ? 600 : 400, cursor: "pointer", transition: "all 0.18s",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Module cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {filteredModules.map(m => {
              const pct = m.lesson_count > 0 ? Math.round(m.completed_count / m.lesson_count * 100) : 0
              return (
                <div key={m.id} onClick={() => openModule(m)}
                  style={{ background: C.surface, border: `1px solid ${m.locked ? C.border : pct === 100 ? C.green + "30" : C.border}`, borderRadius: 14, padding: "22px", cursor: "pointer", transition: "all 0.18s", opacity: m.locked ? 0.7 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = m.locked ? C.border : C.gold + "50"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = m.locked ? C.border : pct === 100 ? C.green + "30" : C.border}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: m.track === "basics" ? C.green : C.gold, letterSpacing: "0.14em", marginBottom: 6 }}>
                        {m.track.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{m.title}</div>
                    </div>
                    {m.locked ? (
                      <div style={{ padding: "4px 10px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, fontFamily: C.mono, fontSize: 9, color: C.text3, flexShrink: 0, marginLeft: 12 }}>
                        🔒 {m.tier_required.toUpperCase()}
                      </div>
                    ) : pct === 100 ? (
                      <div style={{ padding: "4px 10px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 6, fontFamily: C.mono, fontSize: 9, color: C.green, flexShrink: 0, marginLeft: 12 }}>
                        ✓ DONE
                      </div>
                    ) : null}
                  </div>

                  <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>{m.description}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{m.lesson_count} lessons</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: pct > 0 ? (pct === 100 ? C.green : C.gold) : C.text3 }}>{pct}%</span>
                  </div>

                  <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.green : C.gold, borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, borderRadius: 8, fontWeight: 500, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// SETTINGS

// PLAN UPGRADE
const PLANS = [
  { id: "pro",      name: "Pro",      price: 2500,  color: "#5b9cf6", period: "/month",
    features: ["3 MT5 accounts", "Default + 1 library strategy", "Build up to 3 custom strategies", "Trading Journal", "Backtest analytics (500 candles)", "Unlimited AI signal runs", "Email support"] },
  { id: "elite",    name: "Elite",    price: 5000,  color: "#d4a843", period: "/month",
    features: ["5 MT5 accounts", "Default + library + 1 custom strategy", "Build up to 5 custom strategies", "Full performance analytics", "Backtest (1000 candles)", "Priority support"] },
  { id: "platinum", name: "Platinum", price: 9000,  color: "#e2c4f0", period: "/month",
    features: ["Unlimited MT5 accounts", "Unlimited strategy combinations", "Unlimited custom strategies", "Full analytics", "Backtest (2000 candles)", "Dedicated account manager", "API access"] },
]

const CRYPTO_ADDRESSES = {
  BTC:  "1Cf7ZtNUgwbjprMNFGGBa3R4CdGP31kcby",
  USDT: "TH8iFuPeXVa8PVDp8urADSEhYzrGdqZbB3",
}

const MPESA_PAYBILL  = "6941661"

function PlanUpgrade({ user }) {
  const currentPlan = user?.subscription_plan || "free"
  const [selected,   setSelected]   = useState(null)
  const [payMethod,  setPayMethod]  = useState("mpesa")
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [txRef,      setTxRef]      = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [status,     setStatus]     = useState("")
  const [cryptoCoin, setCryptoCoin] = useState("USDT")

  const submit = async () => {
    if (!selected || !txRef.trim()) { setStatus("fill"); return }
    setSubmitting(true); setStatus("")
    try {
      await api.post("/payments/submit", {
        plan: selected.id,
        method: payMethod,
        tx_ref: txRef,
        phone: mpesaPhone,
        amount: selected.price,
      })
      setStatus("submitted")
    } catch(e) { setStatus("error") }
    setSubmitting(false)
  }

  const inStyle = { width: "100%", background: C.surface2, border: `1px solid ${C.border2}`,
    borderRadius: 8, padding: "10px 14px", fontFamily: C.mono, fontSize: 13,
    color: C.text, outline: "none" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800 }}>

      {/* Current plan badge */}
      <div style={{ padding: "12px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 3 }}>CURRENT PLAN</div>
          <div style={{ fontFamily: C.display, fontSize: 18, color: C.gold }}>{currentPlan.toUpperCase()}</div>
        </div>
        {currentPlan !== "free" && (
          <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>Renews monthly · Cancel anytime</div>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {PLANS.filter(p => p.id !== currentPlan).map(p => (
          <div key={p.id} onClick={() => setSelected(p)} style={{
            background: selected?.id === p.id ? `rgba(${p.color === "#5b9cf6" ? "91,156,246" : p.color === "#d4a843" ? "212,168,67" : "226,196,240"},0.08)` : C.surface,
            border: `1px solid ${selected?.id === p.id ? p.color : C.border}`,
            borderRadius: 14, padding: "20px", cursor: "pointer", transition: "all 0.2s",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.color }} />
            <div style={{ fontFamily: C.mono, fontSize: 10, color: p.color, letterSpacing: "0.12em", marginBottom: 6 }}>{p.name.toUpperCase()}</div>
            <div style={{ fontFamily: C.display, fontSize: 26, color: p.color, marginBottom: 2 }}>KSh {p.price.toLocaleString()}</div>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 14 }}>/month</div>
            {p.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: p.color, fontSize: 11, flexShrink: 0 }}>✓</span>
                <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{f}</span>
              </div>
            ))}
            {selected?.id === p.id && (
              <div style={{ marginTop: 12, fontFamily: C.mono, fontSize: 9, color: p.color, letterSpacing: "0.1em" }}>✓ SELECTED</div>
            )}
          </div>
        ))}
      </div>

      {/* Payment section */}
      {selected && (
        <div style={{ background: C.surface, border: `1px solid ${selected.color}30`, borderRadius: 14, padding: "24px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: selected.color, letterSpacing: "0.12em", marginBottom: 20 }}>
            PAYMENT — {selected.name.toUpperCase()} · KSh {selected.price.toLocaleString()}/month
          </div>

          {/* Payment method tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[["mpesa", "📱 M-Pesa"], ["crypto", "₿ Crypto"]].map(([id, label]) => (
              <button key={id} onClick={() => setPayMethod(id)} style={{
                padding: "8px 18px", borderRadius: 8, border: `1px solid ${payMethod === id ? selected.color : C.border}`,
                background: payMethod === id ? `${selected.color}15` : "transparent",
                fontFamily: C.sans, fontSize: 13, fontWeight: payMethod === id ? 600 : 400,
                color: payMethod === id ? selected.color : C.text3, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* M-Pesa flow */}
          {payMethod === "mpesa" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "14px 18px", background: "rgba(61,214,140,0.06)", border: `1px solid ${C.green}20`, borderRadius: 10 }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.green, letterSpacing: "0.1em", marginBottom: 8 }}>HOW TO PAY VIA M-PESA</div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.8 }}>
                  1. Go to <strong style={{ color: C.text }}>M-Pesa</strong> on your phone<br/>
                  2. Select <strong style={{ color: C.text }}>Lipa Na M-Pesa &rarr; Buy Goods</strong><br/>
                  3. Enter Till No: <strong style={{ color: C.gold }}>{MPESA_PAYBILL}</strong><br/>
                  4. Amount: <strong style={{ color: C.gold }}>KSh {selected.price.toLocaleString()}</strong><br/>
                  6. Enter your M-Pesa PIN and confirm<br/>
                  7. Copy the <strong style={{ color: C.text }}>M-Pesa confirmation code</strong> (e.g. RGH2X1Y3Z4) and paste below
                </div>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>YOUR PHONE NUMBER</div>
                <input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
                  placeholder="07XXXXXXXX" style={inStyle} />
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>M-PESA CONFIRMATION CODE</div>
                <input value={txRef} onChange={e => setTxRef(e.target.value.toUpperCase())}
                  placeholder="e.g. RGH2X1Y3Z4" style={inStyle} />
              </div>
            </div>
          )}

          {/* Crypto flow */}
          {payMethod === "crypto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                {["USDT", "BTC"].map(coin => (
                  <button key={coin} onClick={() => setCryptoCoin(coin)} style={{
                    padding: "6px 16px", borderRadius: 6,
                    border: `1px solid ${cryptoCoin === coin ? selected.color : C.border}`,
                    background: cryptoCoin === coin ? `${selected.color}15` : "transparent",
                    fontFamily: C.mono, fontSize: 11, color: cryptoCoin === coin ? selected.color : C.text3,
                    cursor: "pointer",
                  }}>{coin}</button>
                ))}
              </div>
              <div style={{ padding: "14px 18px", background: "rgba(212,168,67,0.06)", border: `1px solid ${C.gold}20`, borderRadius: 10 }}>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", marginBottom: 8 }}>
                  SEND {cryptoCoin} {cryptoCoin === "USDT" ? "(TRC-20)" : ""}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 6 }}>WALLET ADDRESS</div>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text, background: C.surface2, padding: "10px 14px", borderRadius: 8, wordBreak: "break-all", marginBottom: 10 }}>
                  {CRYPTO_ADDRESSES[cryptoCoin]}
                </div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, lineHeight: 1.7 }}>
                  Send exactly <strong style={{ color: C.gold }}>KSh {selected.price.toLocaleString()}</strong> equivalent in {cryptoCoin}.<br/>
                  After sending, paste your transaction hash below.
                </div>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>TRANSACTION HASH / TX ID</div>
                <input value={txRef} onChange={e => setTxRef(e.target.value)}
                  placeholder="0x..." style={inStyle} />
              </div>
            </div>
          )}

          {/* Status messages */}
          {status === "submitted" && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(61,214,140,0.08)", border: `1px solid ${C.green}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.green }}>
              ✓ Payment submitted. Our team will verify and upgrade your account within 1 hour. You will receive a notification once confirmed.
            </div>
          )}
          {status === "fill" && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red }}>
              Please fill in all required fields.
            </div>
          )}
          {status === "error" && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red }}>
              Submission failed. Please try again or contact support.
            </div>
          )}

          {status !== "submitted" && (
            <button onClick={submit} disabled={submitting} style={{
              ...btnGold, width: "100%", marginTop: 16,
              background: selected.color, color: selected.color === "#d4a843" || selected.color === "#e2c4f0" ? "#000" : "#fff",
              opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? "Submitting..." : "Submit Payment Confirmation"}
            </button>
          )}

          <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3, marginTop: 12, textAlign: "center" }}>
            Questions? Contact <span style={{ color: C.gold }}>support@pesapips.com</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Settings({ user }) {
  const [tab,         setTab]         = useState("account")
  const [pwForm,      setPwForm]      = useState({ current: "", newpw: "", confirm: "" })
  const [pwStatus,    setPwStatus]    = useState("")
  const [nameForm,    setNameForm]    = useState({ display_name: user?.display_name || "" })
  const [nameStatus,  setNameStatus]  = useState("")
  const [notifs,      setNotifs]      = useState({
    trade_open:    true,
    trade_close:   true,
    signal_alert:  false,
    weekly_report: true,
    news_alert:    false,
  })
  const [notifStatus, setNotifStatus] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [sysStats,    setSysStats]    = useState(null)
  const [sysLoading,  setSysLoading]  = useState(false)

  const fetchSysStats = async () => {
    setSysLoading(true)
    try {
      const r = await api.get("/trading/system/stats")
      setSysStats(r.data)
    } catch {}
    setSysLoading(false)
  }

  useEffect(() => {
    if (tab === "system") fetchSysStats()
  }, [tab])

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.newpw) { setPwStatus("error:fill"); return }
    if (pwForm.newpw !== pwForm.confirm) { setPwStatus("error:match"); return }
    if (pwForm.newpw.length < 8) { setPwStatus("error:short"); return }
    setPwStatus("saving")
    try {
      await api.post("/auth/change-password", { current_password: pwForm.current, new_password: pwForm.newpw })
      setPwStatus("saved")
      setPwForm({ current: "", newpw: "", confirm: "" })
      setTimeout(() => setPwStatus(""), 3000)
    } catch (err) {
      setPwStatus("error:" + (err.response?.data?.detail || "failed"))
    }
  }

  const saveNotifs = async () => {
    setNotifStatus("saving")
    try {
      await api.post("/auth/notifications", notifs)
      setNotifStatus("saved")
      setTimeout(() => setNotifStatus(""), 2000)
    } catch { setNotifStatus("error") }
  }

  const TABS = [
    { id: "account",  label: "Account"       },
    { id: "security", label: "Security"       },
    { id: "notifs",   label: "Notifications"  },
    { id: "plan",     label: "Plan & Billing" },
    { id: "system",   label: "System Stats"   },
    { id: "danger",   label: "Danger Zone"    },
  ]

  const iLabel = (label) => (
    <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>{label}</label>
  )

  return (
    <div>
      <SectionHeader title="Settings" sub="Manage your account, security and preferences." />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${t.id === "danger" ? C.red : C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? (t.id === "danger" ? C.red : C.gold) : C.text3,
            cursor: "pointer", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── ACCOUNT TAB ── */}
      {tab === "account" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>ACCOUNT INFO</div>
            <div style={{ marginBottom: 16 }}>
              {iLabel("EMAIL ADDRESS")}
              <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text, padding: "10px 14px", background: C.surface2, borderRadius: 8 }}>{user?.email || "—"}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 5 }}>Email cannot be changed. Contact support if needed.</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {iLabel("DISPLAY NAME")}
              <div style={{ display: "flex", gap: 10 }}>
                <input value={nameForm.display_name} onChange={e => setNameForm({ display_name: e.target.value })}
                  placeholder="e.g. Kamau" style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
                <button onClick={async () => {
                  setNameStatus("saving")
                  try { await api.patch("/auth/me", { display_name: nameForm.display_name }); setNameStatus("saved"); setTimeout(() => setNameStatus(""), 2000) }
                  catch { setNameStatus("error") }
                }} style={{ ...btnGold, padding: "10px 16px", fontSize: 12, whiteSpace: "nowrap" }}>
                  {nameStatus === "saving" ? "..." : nameStatus === "saved" ? "✓" : "Save"}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              {iLabel("MEMBER SINCE")}
              <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text2 }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"}</div>
            </div>
            <div>
              {iLabel("ACCOUNT ID")}
              <div style={{ fontFamily: C.mono, fontSize: 13, color: C.text3 }}>#{user?.id || "—"}</div>
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>CURRENT PLAN</div>
            <div style={{ padding: "16px 18px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.2)`, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: C.display, fontSize: 20, color: C.text }}>{(user?.subscription_plan || "FREE").toUpperCase()}</span>
                <Badge label="ACTIVE" color={C.green} dim={C.greenDim} />
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
                {user?.subscription_plan === "free" ? "Free forever — upgrade to unlock more features" :
                 user?.subscription_plan === "pro"   ? "KSh 2,500 / month — next billing on —" :
                                                       "KSh 5,000 / month — next billing on —"}
              </div>
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.1em", marginBottom: 12 }}>PLAN FEATURES</div>
            {(user?.subscription_plan === "free" ? [
              "✓ Market watch — all 15 assets",
              "✓ 5 signal runs per day",
              "✓ Basic backtest (100 candles)",
              "✓ Economic calendar + news",
              "✗ Strategy builder",
              "✗ Live auto-trading",
              "✗ Trading journal",
            ] : user?.subscription_plan === "pro" ? [
              "✓ Everything in Free",
              "✓ 3 MT5 accounts",
              "✓ Live auto-trading",
              "✓ Strategy builder (5 strategies)",
              "✓ Full backtest (500 candles)",
              "✓ Trading journal",
              "✗ Unlimited MT5 accounts",
              "✗ API access",
            ] : [
              "✓ Everything in Pro",
              "✓ Unlimited MT5 accounts",
              "✓ Unlimited strategies",
              "✓ Full performance analytics",
              "✓ API access",
              "✓ Dedicated account manager",
              "✓ Priority support",
            ]).map((f, i) => (
              <div key={i} style={{ fontFamily: C.sans, fontSize: 13, color: f.startsWith("✓") ? C.text2 : C.text3, marginBottom: 6, opacity: f.startsWith("✗") ? 0.5 : 1 }}>{f}</div>
            ))}
            {user?.subscription_plan !== "elite" && (
              <button onClick={() => setTab("plan")} style={{ ...btnGold, width: "100%", marginTop: 16 }}>
                Upgrade plan →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {tab === "security" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>CHANGE PASSWORD</div>
            <div style={{ marginBottom: 14 }}>
              {iLabel("CURRENT PASSWORD")}
              <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({...p, current: e.target.value}))}
                placeholder="Your current password" style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
            <div style={{ marginBottom: 14 }}>
              {iLabel("NEW PASSWORD")}
              <input type="password" value={pwForm.newpw} onChange={e => setPwForm(p => ({...p, newpw: e.target.value}))}
                placeholder="Minimum 8 characters" style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
            <div style={{ marginBottom: 20 }}>
              {iLabel("CONFIRM NEW PASSWORD")}
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))}
                placeholder="Repeat new password" style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
            {pwStatus.startsWith("error") && (
              <div style={{ padding: "10px 14px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red, marginBottom: 14 }}>
                {pwStatus === "error:fill"  ? "Please fill in all fields." :
                 pwStatus === "error:match" ? "New passwords do not match." :
                 pwStatus === "error:short" ? "Password must be at least 8 characters." :
                 "Failed to change password. Check your current password."}
              </div>
            )}
            {pwStatus === "saved" && (
              <div style={{ padding: "10px 14px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.green, marginBottom: 14 }}>
                ✓ Password changed successfully.
              </div>
            )}
            <button onClick={changePassword} disabled={pwStatus === "saving"}
              style={{ ...btnGold, width: "100%", opacity: pwStatus === "saving" ? 0.6 : 1 }}>
              {pwStatus === "saving" ? "Saving..." : "Change password"}
            </button>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>SECURITY INFO</div>
            {[
              { label: "Last login",         val: new Date().toLocaleString("en-KE"),   color: C.green },
              { label: "Login method",       val: "Email + password",                   color: C.text2 },
              { label: "2FA",                val: "Not enabled (coming soon)",          color: C.text3 },
              { label: "Active sessions",    val: "1 session",                          color: C.text2 },
              { label: "MT5 passwords",      val: "Encrypted at rest",                  color: C.green },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontFamily: C.sans, fontSize: 13, color: C.text2 }}>{row.label}</span>
                <span style={{ fontFamily: C.mono, fontSize: 11, color: row.color }}>{row.val}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: "14px 16px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 10 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em", marginBottom: 6 }}>SECURITY TIP</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>Never share your PesaPips password or your MT5 investor password with anyone. PesaPips staff will never ask for your password.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === "notifs" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px", maxWidth: 600 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 20 }}>EMAIL NOTIFICATIONS</div>
          {[
            { key: "trade_open",    label: "Trade opened",        sub: "When the AI engine opens a new position" },
            { key: "trade_close",   label: "Trade closed",        sub: "When a position is closed with P&L result" },
            { key: "signal_alert",  label: "Signal alert",        sub: "When a new BUY or SELL signal is generated" },
            { key: "weekly_report", label: "Weekly report",       sub: "Summary of your trading week every Monday" },
            { key: "news_alert",    label: "High-impact news",    sub: "Before major events (NFP, FOMC, CPI)" },
          ].map(n => (
            <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{n.label}</div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>{n.sub}</div>
              </div>
              <div onClick={() => setNotifs(p => ({...p, [n.key]: !p[n.key]}))}
                style={{ width: 44, height: 24, borderRadius: 12, background: notifs[n.key] ? C.gold : C.surface3, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0, border: `1px solid ${notifs[n.key] ? C.gold : C.border2}` }}>
                <div style={{ position: "absolute", top: 2, left: notifs[n.key] ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: notifs[n.key] ? "#000" : C.text3, transition: "left 0.2s" }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={saveNotifs} style={{ ...btnGold, opacity: notifStatus === "saving" ? 0.6 : 1 }}>
              {notifStatus === "saving" ? "Saving..." : notifStatus === "saved" ? "✓ Saved" : "Save preferences"}
            </button>
          </div>
        </div>
      )}

      {/* ── PLAN & BILLING TAB ── */}
      {tab === "plan" && (
        <PlanUpgrade user={user} />
      )}

      {/* ── DANGER ZONE ── */}
      
      {tab === "system" && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text2, fontWeight: 600 }}>SYSTEM STATUS</span>
            <button onClick={fetchSysStats} disabled={sysLoading} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, fontFamily: C.mono, fontSize: 10, cursor: "pointer" }}>
              {sysLoading ? "Refreshing..." : "↺ Refresh"}
            </button>
          </div>

          {sysLoading && !sysStats ? (
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, padding: 20 }}>Loading system stats...</div>
          ) : sysStats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Backend */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 14 }}>BACKEND SERVER</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    ["Status", sysStats.backend?.status === "online" ? "● Online" : "● Offline", sysStats.backend?.status === "online" ? C.green : C.red],
                    ["CPU", sysStats.backend?.cpu_pct + "%", sysStats.backend?.cpu_pct > 80 ? C.red : sysStats.backend?.cpu_pct > 50 ? C.gold : C.green],
                    ["Memory", sysStats.backend?.mem_used + " / " + sysStats.backend?.mem_total, sysStats.backend?.mem_pct > 80 ? C.red : C.text],
                    ["Disk", sysStats.backend?.disk_pct + "%", sysStats.backend?.disk_pct > 90 ? C.red : C.text],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, color, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MT5 Bridge */}
              <div style={{ background: C.surface, border: `1px solid ${sysStats.mt5?.connected ? C.green+"40" : C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 14 }}>MT5 BRIDGE</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[
                    ["Connection", sysStats.mt5?.connected ? "● Connected" : "● Disconnected", sysStats.mt5?.connected ? C.green : C.red],
                    ["Server", sysStats.mt5?.server || "—", C.text],
                    ["Login", sysStats.mt5?.login ? "#" + sysStats.mt5.login : "—", C.text],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 12, color, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategies */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 14 }}>YOUR STRATEGIES</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[
                    ["Total Strategies", sysStats.strategies?.total, C.text],
                    ["Active Now", sysStats.strategies?.active, sysStats.strategies?.active > 0 ? C.green : C.text3],
                    ["Plan", (sysStats.plan || "free").toUpperCase(), C.gold],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 14, color, fontWeight: 700 }}>{val ?? "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, padding: 20 }}>Failed to load system stats.</div>
          )}
        </div>
      )}

      {tab === "danger" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.red}30`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.red, letterSpacing: "0.14em", marginBottom: 20 }}>DANGER ZONE</div>
            <div style={{ marginBottom: 24, padding: "16px 18px", background: C.redDim, border: `1px solid ${C.red}20`, borderRadius: 10 }}>
              <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Delete account</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 14 }}>
                This permanently deletes your account, all strategies, trade history, journal entries and progress. This cannot be undone.
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>TYPE "DELETE MY ACCOUNT" TO CONFIRM</label>
                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE MY ACCOUNT" style={{ ...inputStyle }}
                  onFocus={e => e.target.style.borderColor = C.red}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <button
                disabled={deleteConfirm !== "DELETE MY ACCOUNT"}
                onClick={() => alert("Account deletion requires confirmation from support. Please email support@pesapips.com")}
                style={{ background: deleteConfirm === "DELETE MY ACCOUNT" ? C.red : C.surface3, border: "none", color: deleteConfirm === "DELETE MY ACCOUNT" ? "#fff" : C.text3, padding: "10px 20px", borderRadius: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: "0.1em", cursor: deleteConfirm === "DELETE MY ACCOUNT" ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                Delete my account permanently
              </button>
            </div>
            <div style={{ padding: "14px 16px", background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 10 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.1em", marginBottom: 6 }}>BEFORE YOU GO</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                Want to pause instead? You can cancel your subscription without deleting your account. Your data stays safe and you can reactivate any time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// PROFILE
function Profile({ user, summary }) {
  const [accounts,   setAccounts]   = useState([])
  const [strategies, setStrategies] = useState([])
  const [progress,   setProgress]   = useState(null)

  useEffect(() => {
    api.get("/mt5/accounts").then(r => setAccounts(r.data)).catch(() => {})
    api.get("/strategies/mine").then(r => setStrategies(r.data)).catch(() => {})
    api.get("/courses/progress/summary").then(r => setProgress(r.data)).catch(() => {})
  }, [])

  const joined    = user?.created_at ? new Date(user.created_at) : null
  const daysSince = joined ? Math.floor((new Date() - joined) / 86400000) : 0
  const trades    = summary?.total_trades   || 0
  const wins      = summary?.winning_trades || 0
  const pnl       = summary?.daily_pnl      || 0
  const winrate   = trades > 0 ? (wins / trades * 100).toFixed(1) : "0"
  const initial   = user?.email?.[0]?.toUpperCase() || "U"
  const username  = user?.display_name || user?.email?.split("@")[0] || "Trader"
  const activeStrats = strategies.filter(s => s.is_active)

  const TIER_COLOR = { free: C.text3, pro: C.blue, elite: C.gold }
  const plan = (user?.subscription_plan || "free").toLowerCase()

  return (
    <div>
      <SectionHeader title="Profile" sub="Your trading identity, connected brokers and account overview." />

      {/* Top row — identity + stats */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>

        {/* Identity card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, #a07020)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#000", fontFamily: C.display, marginBottom: 14, boxShadow: `0 0 0 4px ${C.goldDim}` }}>
            {initial}
          </div>
          <div style={{ fontFamily: C.display, fontSize: 20, color: C.text, marginBottom: 3 }}>{username}</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 14 }}>{user?.email || "—"}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: `${TIER_COLOR[plan]}15`, border: `1px solid ${TIER_COLOR[plan]}30`, borderRadius: 20, marginBottom: 20 }}>
            <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: TIER_COLOR[plan], letterSpacing: "0.1em" }}>{plan.toUpperCase()} PLAN</span>
          </div>
          {[
            ["Member since", joined ? joined.toLocaleDateString("en-KE", { month: "short", year: "numeric" }) : "—", C.text],
            ["Days active",  daysSince,   C.gold],
            ["Account ID",   "#" + (user?.id || "—"), C.text3],
            ["Points",       progress?.points_balance ?? "—", C.gold],
          ].map(([label, val, color]) => (
            <div key={label} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "9px 12px", background: C.surface2, borderRadius: 7, marginBottom: 6 }}>
              <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{label}</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, color }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <StatCard label="Total trades"  value={trades}                                    color={C.blue}  />
            <StatCard label="Win rate"       value={winrate + "%"}                             color={parseFloat(winrate) >= 50 ? C.green : C.red} />
            <StatCard label="Total PnL"      value={(pnl >= 0 ? "+$" : "-$") + Math.abs(pnl).toFixed(2)} color={pnl >= 0 ? C.green : C.red} />
            <StatCard label="Strategies"     value={strategies.length}                        color={C.gold}  />
          </div>

          {/* Learning progress */}
          {progress && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em" }}>LEARNING PROGRESS</span>
                <span style={{ fontFamily: C.mono, fontSize: 11, color: C.gold }}>{progress.points_balance} pts · {progress.completed_lessons}/{progress.total_lessons} lessons</span>
              </div>
              <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress.progress_pct}%`, background: C.gold, borderRadius: 3, transition: "width 0.8s ease" }} />
              </div>
            </div>
          )}

          {/* Active strategies */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 12 }}>ACTIVE STRATEGIES</div>
            {activeStrats.length === 0 ? (
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No active strategies — go to Strategy Builder to activate one.</div>
            ) : activeStrats.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>{s.custom_params?.strategy_name || "Unnamed"}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{s.asset} · {s.timeframe}</div>
                </div>
                <Badge label="LIVE" color={C.green} dim={C.greenDim} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MT5 Connected Brokers */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 16 }}>CONNECTED BROKERS</div>
        {accounts.length === 0 ? (
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No brokers connected yet. Go to MT5 Connect to add your first account.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ background: C.surface2, border: `1px solid ${acc.is_active ? C.gold + "30" : C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{acc.account_number}</div>
                    <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3 }}>{acc.server}</div>
                  </div>
                  <Badge label={acc.is_active ? "ACTIVE" : "IDLE"} color={acc.is_active ? C.green : C.text3} dim={acc.is_active ? C.greenDim : "rgba(90,96,112,0.1)"} />
                </div>
                {acc.broker_name && <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, marginBottom: 8 }}>{acc.broker_name}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {strategies.filter(s => s.is_active).slice(0,2).map(s => (
                    <span key={s.id} style={{ fontFamily: C.mono, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.goldDim, color: C.gold }}>{s.custom_params?.strategy_name || "EMA"}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {plan === "free" && (
        <div style={{ background: "rgba(212,168,67,0.05)", border: `1px solid rgba(212,168,67,0.2)`, borderRadius: 14, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: C.display, fontSize: 20, color: C.text, marginBottom: 6 }}>Upgrade to Pro</div>
            <div style={{ fontFamily: C.sans, fontSize: 14, color: C.text2 }}>Live auto-trading, 3 MT5 accounts, strategy builder and trading journal for KSh 2,500/month.</div>
          </div>
          <button style={{ ...btnGold, padding: "12px 24px", fontSize: 14, flexShrink: 0 }}>Upgrade now →</button>
        </div>
      )}
    </div>
  )
}

// SUPPORT
const FAQ = [
  { q: "How do I connect my MT5 account?",          a: "Go to MT5 Connect in the sidebar. Enter your account number, MT5 password, and server name (e.g. ICMarkets-Live01). Your password is encrypted before storage — we never see it in plain text." },
  { q: "Which brokers are supported?",               a: "Any broker that supports MetaTrader 5 (MT5). This includes ICMarkets, Exness, FBS, Pepperstone, XM, HotForex and hundreds of others. If your broker offers MT5, PesaPips can connect to it." },
  { q: "What does the AI signal engine actually do?", a: "It calculates EMA 9/21/50 crossovers, RSI momentum, and MACD crossovers on every candle. When all three align — for example EMA bullish + RSI oversold + MACD crossing up — it generates a BUY signal. The logic is 100% transparent and adjustable." },
  { q: "Can I lose money using PesaPips?",           a: "Yes. All trading carries risk. PesaPips is a tool that automates a strategy — it does not guarantee profits. Always test on a demo account first, set conservative risk per trade (1% or less), and never trade money you cannot afford to lose." },
  { q: "What is the risk per trade setting?",        a: "This controls what percentage of your account balance is risked on each trade. At 1%, a $1,000 account risks $10 per trade. We recommend starting at 0.5%-1% and only increasing after consistent backtesting results." },
  { q: "How does the news filter work?",             a: "When enabled, the bot pauses trading 30 minutes before and after high-impact news events (CPI, NFP, FOMC, central bank decisions). This prevents the bot from entering trades during extremely volatile news spikes." },
  { q: "What is backtesting?",                       a: "Backtesting runs your strategy against historical price data to see how it would have performed. It shows you winrate, profit factor, max drawdown and return before you risk real money. Always backtest before going live." },
  { q: "How do I cancel my subscription?",          a: "You can cancel any time from Settings → Upgrade Plan. Your access continues until the end of the billing period. No contracts, no cancellation fees." },
]


// QUICK LINKS
function QuickLinks() {
  const [modal, setModal] = useState(null) // "bug" | "feature" | "review"
  const [form,  setForm]  = useState({})
  const [status, setStatus] = useState("")

  const submit = async (type) => {
    setStatus("sending")
    try {
      await api.post("/support/feedback", { type, ...form })
      setStatus("sent")
      setTimeout(() => { setModal(null); setForm({}); setStatus("") }, 2000)
    } catch {
      setStatus("error")
    }
  }

  const fld = (label, key, placeholder, type="text") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
          placeholder={placeholder} rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2} />
      ) : type === "select" ? (
        <select value={form[key] || ""} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2}>
          {placeholder.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key] || ""} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
          placeholder={placeholder} style={inputStyle}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2} />
      )}
    </div>
  )

  const MODAL_CONFIG = {
    bug: {
      title: "Report a Bug",
      color: C.red,
      icon: "🐛",
      desc: "Describe the bug clearly — what happened vs what you expected. Screenshots help.",
      fields: () => (<>
        {fld("PAGE / SECTION", "page", "e.g. Live Signal, Backtest, Strategy Builder")}
        {fld("WHAT HAPPENED?", "what_happened", "Describe what went wrong...", "textarea")}
        {fld("STEPS TO REPRODUCE", "steps", "1. I clicked... 2. Then...", "textarea")}
        {fld("EXPECTED BEHAVIOUR", "expected", "What should have happened?", "textarea")}
        {fld("SEVERITY", "severity", [
          {value:"", label:"Select severity..."},
          {value:"low", label:"Low — minor visual issue"},
          {value:"medium", label:"Medium — feature not working"},
          {value:"high", label:"High — blocks me from trading"},
          {value:"critical", label:"Critical — data loss / account issue"},
        ], "select")}
      </>),
    },
    feature: {
      title: "Feature Request",
      color: C.blue,
      icon: "💡",
      desc: "Tell us what you'd like built. The best requests explain the problem, not just the solution.",
      fields: () => (<>
        {fld("FEATURE TITLE", "title", "e.g. Email alert when signal triggers")}
        {fld("THE PROBLEM IT SOLVES", "problem", "What are you currently unable to do?", "textarea")}
        {fld("PROPOSED SOLUTION", "solution", "How would you like it to work?", "textarea")}
        {fld("PRIORITY TO YOU", "priority", [
          {value:"", label:"Select priority..."},
          {value:"nice", label:"Nice to have"},
          {value:"important", label:"Important — would use it a lot"},
          {value:"critical", label:"Critical — blocking my workflow"},
        ], "select")}
      </>),
    },
    review: {
      title: "Leave a Review",
      color: C.gold,
      icon: "⭐",
      desc: "Your review helps other traders discover PesaPips. Honest feedback is always welcome.",
      fields: () => (<>
        {fld("YOUR NAME", "reviewer_name", "How should we display your name?")}
        {fld("YOUR PLAN", "plan", [
          {value:"", label:"Select your plan..."},
          {value:"free", label:"Free"},
          {value:"pro", label:"Pro"},
          {value:"elite", label:"Elite"},
        ], "select")}
        {fld("RATING", "rating", [
          {value:"", label:"Select rating..."},
          {value:"5", label:"⭐⭐⭐⭐⭐ — Excellent"},
          {value:"4", label:"⭐⭐⭐⭐ — Good"},
          {value:"3", label:"⭐⭐⭐ — Average"},
          {value:"2", label:"⭐⭐ — Below average"},
          {value:"1", label:"⭐ — Poor"},
        ], "select")}
        {fld("YOUR REVIEW", "body", "Share your honest experience with PesaPips...", "textarea")}
        {fld("TRADING SINCE", "trading_since", "e.g. 2 years, 6 months (optional)")}
      </>),
    },
  }

  const cfg = modal ? MODAL_CONFIG[modal] : null

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {/* Discord */}
        <a href="https://discord.gg/pesapips" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", cursor: "pointer", transition: "border-color 0.2s", height: "100%" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#5865f240"}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎮</div>
            <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Discord community</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Join traders, watch tutorials and get support</div>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: "#5865f2", letterSpacing: "0.08em" }}>Join Discord →</div>
          </div>
        </a>

        {/* Docs — coming soon */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", opacity: 0.6, cursor: "default" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📖</div>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Documentation</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Full setup guide and API reference</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.08em" }}>Coming soon</div>
        </div>

        {/* Leave a review */}
        <div onClick={() => { setModal("review"); setForm({}) }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${C.gold}40`}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>⭐</div>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Leave a review</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Help other traders discover PesaPips</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.08em" }}>Write review →</div>
        </div>

        {/* Report a bug */}
        <div onClick={() => { setModal("bug"); setForm({}) }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${C.red}40`}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>🐛</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text }}>Report a bug</div>
            <div style={{ padding: "2px 7px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 4, fontFamily: C.mono, fontSize: 8, color: C.red }}>ADMIN INBOX</div>
          </div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Found something broken? Let us know</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.red, letterSpacing: "0.08em" }}>Report issue →</div>
        </div>

        {/* Feature request */}
        <div onClick={() => { setModal("feature"); setForm({}) }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${C.blue}40`}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>💡</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text }}>Feature request</div>
            <div style={{ padding: "2px 7px", background: "rgba(91,156,246,0.1)", border: `1px solid ${C.blue}30`, borderRadius: 4, fontFamily: C.mono, fontSize: 8, color: C.blue }}>ADMIN INBOX</div>
          </div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Suggest improvements to PesaPips</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.blue, letterSpacing: "0.08em" }}>Suggest feature →</div>
        </div>

        {/* Contact support */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px", cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${C.green}40`}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>🎧</div>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>Contact support</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>Email us directly — 24h response</div>
          <a href="mailto:support@pesapips.com" style={{ fontFamily: C.mono, fontSize: 10, color: C.green, letterSpacing: "0.08em", textDecoration: "none" }}>support@pesapips.com →</a>
        </div>
      </div>

      {/* Modal */}
      {modal && cfg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setModal(null); setForm({}); setStatus("") } }}
        >
          <div style={{ background: C.surface, border: `1px solid ${cfg.color}30`, borderRadius: 16, padding: "32px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                <span style={{ fontFamily: C.display, fontSize: 20, color: C.text, letterSpacing: 1 }}>{cfg.title}</span>
              </div>
              <button onClick={() => { setModal(null); setForm({}); setStatus("") }}
                style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                onMouseEnter={e => e.target.style.color = C.text}
                onMouseLeave={e => e.target.style.color = C.text3}
              >✕</button>
            </div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3, marginBottom: 22, lineHeight: 1.6 }}>{cfg.desc}</div>

            {/* Fields */}
            {cfg.fields()}

            {/* Status messages */}
            {status === "sent" && (
              <div style={{ padding: "10px 14px", background: C.greenDim, border: `1px solid ${C.green}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.green, marginBottom: 14 }}>
                ✓ Submitted — our team will review it shortly.
              </div>
            )}
            {status === "error" && (
              <div style={{ padding: "10px 14px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red, marginBottom: 14 }}>
                ⚠ Failed to submit. Please try again or email support@pesapips.com
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { setModal(null); setForm({}); setStatus("") }} style={{ ...btnOutline }}>Cancel</button>
              <button onClick={() => submit(modal)} disabled={status === "sending" || status === "sent"}
                style={{ ...btnGold, opacity: status === "sending" ? 0.6 : 1, background: status === "sent" ? C.green : C.gold }}>
                {status === "sending" ? "Submitting..." : status === "sent" ? "Submitted ✓" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Support() {
  const [openFaq,  setOpenFaq]  = useState(null)
  const [form,     setForm]     = useState({ name: "", email: "", subject: "", message: "" })
  const [status,   setStatus]   = useState("")
  const [activeTab, setActiveTab] = useState("faq")

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { setStatus("error"); return }
    setStatus("sending")
    await new Promise(r => setTimeout(r, 800))
    setStatus("sent")
    setForm({ name: "", email: "", subject: "", message: "" })
  }

  const SYSTEM_STATUS = [
    { service: "API Backend",      status: "operational", latency: "12ms"  },
    { service: "Signal Engine",    status: "operational", latency: "45ms"  },
    { service: "Market Data Feed", status: "operational", latency: "180ms" },
    { service: "MT5 Bridge",       status: "pending",     latency: "—"     },
    { service: "Economic Calendar",status: "operational", latency: "—"     },
    { service: "News Feed",        status: "operational", latency: "—"     },
  ]

  const statusColor = s => s === "operational" ? C.green : s === "pending" ? C.gold : C.red
  const statusDim   = s => s === "operational" ? C.greenDim : s === "pending" ? C.goldDim : C.redDim

  return (
    <div>
      <SectionHeader title="Support" sub="Get help, read the FAQ, or contact the PesaPips team." />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        {[
          { id: "faq",     label: "FAQ"           },
          { id: "contact", label: "Contact Us"     },
          { id: "status",  label: "System Status"  },
          { id: "links",   label: "Quick Links"    },
          { id: "tickets", label: "My Tickets"     },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "11px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? C.gold : C.text3, cursor: "pointer", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* FAQ */}
      {activeTab === "faq" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${openFaq === i ? "rgba(212,168,67,0.25)" : C.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left",
              }}>
                <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: openFaq === i ? C.gold : C.text }}>{item.q}</span>
                <span style={{ color: C.text3, fontSize: 14, flexShrink: 0, marginLeft: 16 }}>{openFaq === i ? "▲" : "▼"}</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px", fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.75, borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 0 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contact */}
      {activeTab === "contact" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 22 }}>SEND A MESSAGE</div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>YOUR NAME</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Kamau Mwangi" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>EMAIL</label>
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border2} />
                </div>
              </div>
              <div>
                <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>SUBJECT</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. MT5 connection issue" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              <div>
                <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 7 }}>MESSAGE</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Describe your issue or question in detail..." rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                  onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border2} />
              </div>
              {status === "error" && <div style={{ fontFamily: C.sans, fontSize: 13, color: C.red }}>Please fill in all required fields.</div>}
              {status === "sent"  && <div style={{ fontFamily: C.sans, fontSize: 13, color: C.green }}>Message sent — we will get back to you within 24 hours.</div>}
              <button type="submit" disabled={status === "sending" || status === "sent"} style={{ ...btnGold, opacity: status === "sending" ? 0.6 : 1 }}>
                {status === "sending" ? "Sending..." : status === "sent" ? "Message sent ✓" : "Send message"}
              </button>
            </form>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em", marginBottom: 16 }}>DIRECT CHANNELS</div>
              {[
                { icon: "🎮", label: "Discord",     val: "discord.gg/pesapips",    sub: "Community + tutorials + support" },
                { icon: "✉️", label: "Email",       val: "support@pesapips.com",   sub: "24h response time" },
              ].map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text }}>{c.val}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.goldDim, border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.12em", marginBottom: 8 }}>RESPONSE TIMES</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.7 }}>Discord typically responds within 2 hours during business hours (EAT). Email responses within 24 hours. Join the Discord server for the fastest response and access to tutorials and community discussions.</div>
            </div>
          </div>
        </div>
      )}

      {/* System Status */}
      {activeTab === "status" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, background: C.surface2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.14em" }}>SYSTEM STATUS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green }}>ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
          {SYSTEM_STATUS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: i < SYSTEM_STATUS.length - 1 ? `1px solid ${C.border}` : "none", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(s.status) }} />
                <span style={{ fontFamily: C.sans, fontSize: 14, color: C.text }}>{s.service}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {s.latency !== "—" && <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{s.latency}</span>}
                <Badge label={s.status.toUpperCase()} color={statusColor(s.status)} dim={statusDim(s.status)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      {activeTab === "links" && (
        <QuickLinks />
      )}

      {/* Tickets */}
      {activeTab === "tickets" && (
        <TicketForm />
      )}
    </div>
  )
}


// TRADING JOURNAL
function TradingJournal() {
  const [tab, setTab]         = useState("log")
  const [trades, setTrades]   = useState([])
  const [summaries, setSumm]  = useState([])
  const [weeklies, setWeek]   = useState([])
  const [psychNotes, setPsych]= useState([])
  const [selEmotion, setSelEmo] = useState("")
  const [filter, setFilter]   = useState("all")
  const [notify, setNotify]   = useState("")

  // Trade form state
  const [tf, setTf] = useState({
    date: new Date().toISOString().slice(0,16),
    pair: "", direction: "buy", session: "London (10:00–19:00 EAT)",
    entry: "", sl: "", tp: "", lot: "", outcome: "win", pnl: "",
    strategy: "", rules: "yes", notes: "",
  })

  // Daily summary form
  const [ds, setDs] = useState({ date: new Date().toISOString().slice(0,10), pnl: "", trades: "", mood: "Disciplined & focused", well: "", wrong: "", tomorrow: "" })

  // Weekly form
  const [wk, setWk] = useState({ date: new Date().toISOString().slice(0,10), pnl: "", lesson: "", psych: "", strategy: "", plan: "" })

  const [psychNote, setPsychNote] = useState("")

  // Load from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("pesapips_journal")
      if (s) {
        const d = JSON.parse(s)
        setTrades(d.trades || [])
        setSumm(d.summaries || [])
        setWeek(d.weeklies || [])
        setPsych(d.psychNotes || [])
      }
    } catch(e) {}
  }, [])

  const persist = (t, s, w, p) => {
    try { localStorage.setItem("pesapips_journal", JSON.stringify({ trades: t, summaries: s, weeklies: w, psychNotes: p })) } catch(e) {}
  }

  const toast = msg => { setNotify(msg); setTimeout(() => setNotify(""), 2500) }

  // Stats
  const closedTrades = trades.filter(t => t.outcome !== "open")
  const wins         = closedTrades.filter(t => t.outcome === "win")
  const totalPnl     = closedTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const pnls         = closedTrades.map(t => parseFloat(t.pnl) || 0)
  const bestTrade    = pnls.length ? Math.max(...pnls) : 0
  const worstTrade   = pnls.length ? Math.min(...pnls) : 0
  const winRate      = closedTrades.length ? ((wins.length / closedTrades.length) * 100).toFixed(0) : 0

  const saveTrade = () => {
    if (!tf.pair) { toast("Select an asset"); return }
    const trade = { id: Date.now(), ...tf }
    const next = [trade, ...trades]
    setTrades(next); persist(next, summaries, weeklies, psychNotes)
    setTf(p => ({ ...p, pair: "", entry: "", sl: "", tp: "", lot: "", pnl: "", notes: "", strategy: "" }))
    setSelEmo(""); toast("Trade logged ✓")
  }

  const deleteTrade = id => {
    const next = trades.filter(t => t.id !== id)
    setTrades(next); persist(next, summaries, weeklies, psychNotes)
    toast("Trade removed")
  }

  const saveSummary = () => {
    const next = [{ id: Date.now(), ...ds }, ...summaries]
    setSumm(next); persist(trades, next, weeklies, psychNotes)
    toast("Daily summary saved ✓")
  }

  const saveWeekly = () => {
    const next = [{ id: Date.now(), ...wk }, ...weeklies]
    setWeek(next); persist(trades, summaries, next, psychNotes)
    toast("Weekly review saved ✓")
  }

  const savePsychNote = () => {
    if (!psychNote.trim()) return
    const next = [{ id: Date.now(), date: new Date().toISOString(), text: psychNote }, ...psychNotes]
    setPsych(next); persist(trades, summaries, weeklies, next)
    setPsychNote(""); toast("Note saved ✓")
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ trades, summaries, weeklies, psychNotes }, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "pesapips_journal_" + new Date().toISOString().slice(0,10) + ".json"
    a.click(); toast("Data exported ✓")
  }

  const ASSETS = ["XAU/USD","XAG/USD","EUR/USD","GBP/USD","USD/JPY","USD/CHF","AUD/USD","USD/KES","BTC/USD","ETH/USD","WTI OIL","NASDAQ","DOW","S&P 500","Other"]
  const SESSIONS = ["Tokyo (03:00–12:00 EAT)","London (10:00–19:00 EAT)","New York (15:00–00:00 EAT)","London/NY Overlap (15:00–19:00 EAT)"]
  const EMOTIONS = [
    { e: "calm",      cls: ""         }, { e: "confident", cls: ""         },
    { e: "anxious",   cls: "warning"  }, { e: "impatient", cls: "warning"  },
    { e: "revenge",   cls: "negative" }, { e: "fomo",      cls: "negative" },
    { e: "fearful",   cls: "negative" }, { e: "greedy",    cls: "warning"  },
  ]
  const EMO_COLOR = { warning: C.amber, negative: C.red, "": C.gold }
  const CHECKLIST = [
    "Trend direction confirmed on higher timeframe (H4/D1)",
    "Entry is WITH the trend, not against exhaustion",
    "Stop loss placed BEFORE entering position",
    "Risk per trade is ≤2% of account balance",
    "Profit target set at minimum 1:2 Risk/Reward",
    "Not revenge trading after a previous loss",
    "I am in the correct trading session for this pair",
  ]
  const [checks, setChecks] = useState(CHECKLIST.map(() => false))

  const filteredTrades = filter === "all" ? trades : trades.filter(t => t.outcome === filter)

  // Psych charts
  const emotions = {}
  let rY = 0, rM = 0, rN = 0
  trades.forEach(t => {
    if (t.emotion) emotions[t.emotion] = (emotions[t.emotion] || 0) + 1
    if (t.rules === "yes") rY++
    else if (t.rules === "mostly") rM++
    else if (t.rules === "no") rN++
  })
  const total = trades.length || 1
  const NEG = ["revenge","fomo","fearful"]
  const WARN = ["anxious","impatient","greedy"]

  const fld = (label, value, onChange, type="text", placeholder="") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border2}
      />
    </div>
  )

  const sel = (label, value, onChange, options) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border2}
      >
        {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  )

  const txt = (label, value, onChange, placeholder="") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</label>
      <textarea value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border2}
      />
    </div>
  )

  const TABS = [
    { id: "log",       label: "Log Trade"     },
    { id: "history",   label: "History"       },
    { id: "daily",     label: "Daily Summary" },
    { id: "weekly",    label: "Weekly Review" },
    { id: "psych",     label: "Psychology"    },
  ]

  return (
    <div>
      <SectionHeader title="Trading Journal" sub="Log trades, track psychology, review performance." />

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          ["Total Trades",  trades.length,                                C.blue,  false],
          ["Win Rate",      winRate + "%",                                 winRate >= 50 ? C.green : C.red, false],
          ["Total P&L",     (totalPnl >= 0 ? "+" : "") + "$" + totalPnl.toFixed(2), totalPnl >= 0 ? C.green : C.red, false],
          ["Best Trade",    "+$" + bestTrade.toFixed(0),                  C.green, false],
          ["Worst Trade",   "$" + worstTrade.toFixed(0),                  C.red,   false],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: "12px 12px 0 0" }} />
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: C.display, fontSize: 24, color, letterSpacing: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 12px", background: tab === t.id ? C.gold : "transparent",
            border: "none", borderRadius: 7, fontFamily: C.mono, fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: tab === t.id ? "#000" : C.text3,
            fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", transition: "all 0.18s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── LOG TRADE ── */}
      {tab === "log" && (
        <div>
          {/* Pre-trade checklist */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontFamily: C.display, fontSize: 16, letterSpacing: 2, color: C.gold, marginBottom: 14 }}>Pre-Trade Checklist</div>
            {CHECKLIST.map((item, i) => (
              <div key={i} onClick={() => setChecks(p => { const n = [...p]; n[i] = !n[i]; return n })}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, border: `1px solid ${checks[i] ? C.gold : C.border2}`, borderRadius: 4, background: checks[i] ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s" }}>
                  {checks[i] && <span style={{ fontSize: 11, color: "#000", fontWeight: "bold" }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: checks[i] ? C.text3 : C.text2, textDecoration: checks[i] ? "line-through" : "none", transition: "all 0.18s" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Trade form */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: C.display, fontSize: 18, letterSpacing: 2, color: C.text, marginBottom: 20 }}>New Trade Entry</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {fld("Date & Time", tf.date, v => setTf(p=>({...p,date:v})), "datetime-local")}
              {sel("Asset", tf.pair, v => setTf(p=>({...p,pair:v})), [{ value:"", label:"Select asset..." }, ...ASSETS.map(a => ({ value: a, label: a }))])}
              {sel("Direction", tf.direction, v => setTf(p=>({...p,direction:v})), [{ value:"buy",label:"BUY / LONG" },{ value:"sell",label:"SELL / SHORT" }])}
              {sel("Session", tf.session, v => setTf(p=>({...p,session:v})), SESSIONS)}
              {fld("Entry Price", tf.entry, v => setTf(p=>({...p,entry:v})), "number", "e.g. 3285.50")}
              {fld("Stop Loss", tf.sl, v => setTf(p=>({...p,sl:v})), "number", "e.g. 3270.00")}
              {fld("Take Profit", tf.tp, v => setTf(p=>({...p,tp:v})), "number", "e.g. 3310.00")}
              {fld("Lot Size", tf.lot, v => setTf(p=>({...p,lot:v})), "number", "0.01")}
              {sel("Outcome", tf.outcome, v => setTf(p=>({...p,outcome:v})), [{ value:"win",label:"WIN" },{ value:"loss",label:"LOSS" },{ value:"be",label:"BREAK EVEN" },{ value:"open",label:"STILL OPEN" }])}
              {fld("P&L (USD)", tf.pnl, v => setTf(p=>({...p,pnl:v})), "number", "+25.00 or -15.00")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 14 }}>
              {sel("Strategy Used", tf.strategy, v => setTf(p=>({...p,strategy:v})), [{ value:"",label:"Select strategy..." },"EMA RSI MACD Classic","EMA + Bollinger Combo","Bollinger Band Breakout","Support & Resistance Bounce","Trend Continuation","Triple Confluence Elite","Scalper M1","News Momentum","Price Action","Other"])}
              <div>
                <label style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.18em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Emotion Before Trade</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EMOTIONS.map(({ e, cls }) => {
                    const col = EMO_COLOR[cls]
                    const active = selEmotion === e
                    return (
                      <button key={e} onClick={() => { setSelEmo(e); setTf(p=>({...p,emotion:e})) }} style={{
                        padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                        fontFamily: C.mono, fontSize: 10, letterSpacing: 1,
                        background: active ? `${col}15` : C.surface2,
                        border: `1px solid ${active ? col : C.border2}`,
                        color: active ? col : C.text3,
                        transition: "all 0.18s",
                      }}>{e}</button>
                    )
                  })}
                </div>
              </div>
              {sel("Followed My Rules?", tf.rules, v => setTf(p=>({...p,rules:v})), [{ value:"yes",label:"Yes — executed plan perfectly" },{ value:"mostly",label:"Mostly — minor deviation" },{ value:"no",label:"No — deviated from plan" }])}
              {txt("Trade Notes & Analysis", tf.notes, v => setTf(p=>({...p,notes:v})), "What did you see? Why did you enter? What happened? What did you learn?")}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { setTf(p=>({...p,pair:"",entry:"",sl:"",tp:"",lot:"",pnl:"",notes:"",strategy:""})); setSelEmo(""); setChecks(CHECKLIST.map(()=>false)) }} style={{ ...btnOutline }}>Clear</button>
              <button onClick={saveTrade} style={{ ...btnGold }}>Save Trade →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["all","win","loss","be"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "6px 14px", borderRadius: 6, border: `1px solid ${filter===f ? C.gold : C.border}`,
                  background: filter===f ? C.goldDim : C.surface2, color: filter===f ? C.gold : C.text3,
                  fontFamily: C.mono, fontSize: 10, letterSpacing: 1, cursor: "pointer", transition: "all 0.18s",
                }}>{f === "all" ? "All" : f === "win" ? "Wins" : f === "loss" ? "Losses" : "Break Even"}</button>
              ))}
            </div>
            <button onClick={exportData} style={{ ...btnOutline, fontSize: 11 }}>Export JSON</button>
          </div>
          {filteredTrades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.text3, fontFamily: C.mono, fontSize: 11, letterSpacing: 2 }}>
              <div style={{ fontSize: 32, marginBottom: 14, opacity: 0.3 }}>◎</div>NO TRADES LOGGED YET
            </div>
          ) : filteredTrades.map(t => (
            <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 20px", marginBottom: 8, display: "grid", gridTemplateColumns: "90px 110px 80px 90px 90px 1fr auto", alignItems: "center", gap: 14, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: t.outcome==="win" ? C.green : t.outcome==="loss" ? C.red : C.amber, borderRadius: "10px 0 0 10px" }} />
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 500, color: C.text }}>{t.pair}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{t.date?.slice(0,10)}</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, padding: "3px 8px", borderRadius: 4, display: "inline-block", background: t.direction==="buy" ? C.greenDim : C.redDim, color: t.direction==="buy" ? C.green : C.red }}>{t.direction?.toUpperCase()}</div>
              <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 500, color: parseFloat(t.pnl)>0 ? C.green : parseFloat(t.pnl)<0 ? C.red : C.amber }}>{parseFloat(t.pnl)>=0?"+":""}{"$"}{(parseFloat(t.pnl)||0).toFixed(2)}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, padding: "2px 8px", borderRadius: 4, background: t.outcome==="win" ? C.greenDim : t.outcome==="loss" ? C.redDim : "rgba(245,158,11,0.1)", color: t.outcome==="win" ? C.green : t.outcome==="loss" ? C.red : C.amber }}>{t.outcome?.toUpperCase()}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.emotion || "—"} {t.rules==="no" ? "⚠" : ""}</div>
              <button onClick={() => deleteTrade(t.id)} style={{ background: "transparent", border: `1px solid ${C.red}`, color: C.red, borderRadius: 6, padding: "4px 10px", fontFamily: C.mono, fontSize: 10, cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── DAILY SUMMARY ── */}
      {tab === "daily" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: C.display, fontSize: 18, letterSpacing: 2, color: C.text, marginBottom: 20 }}>Daily Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {fld("Date", ds.date, v => setDs(p=>({...p,date:v})), "date")}
              {fld("Day P&L (USD)", ds.pnl, v => setDs(p=>({...p,pnl:v})), "number", "+50.00 or -30.00")}
              {fld("Number of Trades", ds.trades, v => setDs(p=>({...p,trades:v})), "number", "3")}
              {sel("Overall Mood", ds.mood, v => setDs(p=>({...p,mood:v})), ["Disciplined & focused","Good but could improve","Struggled with emotions","Overtraded","Revenge traded","Missed setups (hesitation)"])}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 14 }}>
              {txt("What went well today?", ds.well, v => setDs(p=>({...p,well:v})), "Be specific. What rule did you follow? What did you read correctly?")}
              {txt("What went wrong today?", ds.wrong, v => setDs(p=>({...p,wrong:v})), "Be honest. Where did you deviate? What triggered a bad decision?")}
              {txt("Tomorrow's focus", ds.tomorrow, v => setDs(p=>({...p,tomorrow:v})), "One specific thing to improve tomorrow...")}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={saveSummary} style={{ ...btnGold }}>Save Summary →</button>
            </div>
          </div>
          {summaries.map(s => (
            <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: C.display, fontSize: 16, letterSpacing: 2 }}>{s.date}</div>
                <div style={{ fontFamily: C.mono, fontSize: 16, color: parseFloat(s.pnl)>=0 ? C.green : C.red }}>{parseFloat(s.pnl)>=0?"+":""}{"$"}{(parseFloat(s.pnl)||0).toFixed(2)}</div>
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, marginBottom: 10 }}>{s.mood} · {s.trades || 0} trades</div>
              {s.well && <div style={{ marginBottom: 8 }}><span style={{ fontFamily: C.mono, fontSize: 9, color: C.green, letterSpacing: 2 }}>WENT WELL</span><p style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{s.well}</p></div>}
              {s.wrong && <div style={{ marginBottom: 8 }}><span style={{ fontFamily: C.mono, fontSize: 9, color: C.red, letterSpacing: 2 }}>WENT WRONG</span><p style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{s.wrong}</p></div>}
              {s.tomorrow && <div><span style={{ fontFamily: C.mono, fontSize: 9, color: C.blue, letterSpacing: 2 }}>TOMORROW</span><p style={{ fontSize: 13, color: C.text2, marginTop: 4, lineHeight: 1.5 }}>{s.tomorrow}</p></div>}
            </div>
          ))}
        </div>
      )}

      {/* ── WEEKLY REVIEW ── */}
      {tab === "weekly" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: C.display, fontSize: 18, letterSpacing: 2, color: C.text, marginBottom: 20 }}>Weekly Review</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {fld("Week Of", wk.date, v => setWk(p=>({...p,date:v})), "date")}
              {fld("Week P&L (USD)", wk.pnl, v => setWk(p=>({...p,pnl:v})), "number", "+200.00")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 14 }}>
              {txt("Biggest Lesson This Week", wk.lesson, v => setWk(p=>({...p,lesson:v})), "The single most important thing you learned or reinforced this week...")}
              {txt("Psychology Assessment", wk.psych, v => setWk(p=>({...p,psych:v})), "How was your emotional control this week?")}
              {txt("Strategy Performance", wk.strategy, v => setWk(p=>({...p,strategy:v})), "Which setups worked? Which failed?")}
              {txt("Next Week Plan & Rules", wk.plan, v => setWk(p=>({...p,plan:v})), "Specific focus for next week. Pairs to watch. Rules to enforce...")}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={saveWeekly} style={{ ...btnGold }}>Save Review →</button>
            </div>
          </div>
          {weeklies.map(r => (
            <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: C.display, fontSize: 16, letterSpacing: 2 }}>Week of {r.date}</div>
                <div style={{ fontFamily: C.mono, fontSize: 16, color: parseFloat(r.pnl)>=0 ? C.green : C.red }}>{parseFloat(r.pnl)>=0?"+":""}{"$"}{(parseFloat(r.pnl)||0).toFixed(2)}</div>
              </div>
              {r.lesson && <div style={{ marginBottom: 12 }}><span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: 2 }}>KEY LESSON</span><p style={{ fontSize: 13, color: C.text, marginTop: 6, lineHeight: 1.6 }}>{r.lesson}</p></div>}
              {r.psych && <div style={{ marginBottom: 12 }}><span style={{ fontFamily: C.mono, fontSize: 9, color: C.blue, letterSpacing: 2 }}>PSYCHOLOGY</span><p style={{ fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 1.6 }}>{r.psych}</p></div>}
              {r.plan && <div><span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: 2 }}>NEXT WEEK PLAN</span><p style={{ fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 1.6 }}>{r.plan}</p></div>}
            </div>
          ))}
        </div>
      )}

      {/* ── PSYCHOLOGY ── */}
      {tab === "psych" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontFamily: C.display, fontSize: 16, letterSpacing: 2, color: C.gold, marginBottom: 14 }}>House Trading Rules — Non-Negotiable</div>
            {["Stop loss is set the moment I enter. Never after.","Maximum 2% risk per trade. No exceptions regardless of conviction.","After 2 consecutive losses, I close the platform and stop for the day.","I enter WITH trend momentum, never at exhaustion points.","Minimum 1:2 Risk/Reward on every trade. I do not move targets closer.","I never add to a losing position. Ever.","If I feel revenge, FOMO, or anxiety — I do not trade. I journal instead."].map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, color: C.gold, minWidth: 22 }}>0{i+1}</span>
                <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{rule}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Emotion Frequency</div>
              {Object.keys(emotions).length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", fontFamily: C.mono, fontSize: 10, color: C.text3 }}>Log trades to see patterns</div>
              ) : Object.entries(emotions).sort((a,b)=>b[1]-a[1]).map(([em, count]) => {
                const col = NEG.includes(em) ? C.red : WARN.includes(em) ? C.amber : C.gold
                return (
                  <div key={em} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text2, width: 100 }}>{em}</div>
                    <div style={{ flex: 1, height: 4, background: C.border2, borderRadius: 2, margin: "0 12px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${count/total*100}%`, background: col, borderRadius: 2, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, width: 20, textAlign: "right" }}>{count}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Rule Adherence</div>
              {trades.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", fontFamily: C.mono, fontSize: 10, color: C.text3 }}>Log trades to see patterns</div>
              ) : [["Followed", rY, C.gold], ["Mostly", rM, C.amber], ["Broke Rules", rN, C.red]].map(([label, count, col]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text2, width: 100 }}>{label}</div>
                  <div style={{ flex: 1, height: 4, background: C.border2, borderRadius: 2, margin: "0 12px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${count/total*100}%`, background: col, borderRadius: 2, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, width: 20, textAlign: "right" }}>{count}</div>
                </div>
              ))}
              {trades.length > 0 && (
                <div style={{ marginTop: 14, fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
                  Adherence: <span style={{ color: rY/total > 0.7 ? C.green : C.red }}>{((rY/total)*100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Quick Psychology Note</div>
            <textarea value={psychNote} onChange={e => setPsychNote(e.target.value)}
              placeholder="Write anything - how you're feeling about trading today, fears, wins, mindset shifts..."
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", marginBottom: 12 }}
              onFocus={e => e.target.style.borderColor = C.gold}
              onBlur={e => e.target.style.borderColor = C.border2}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={savePsychNote} style={{ ...btnGold }}>Save Note →</button>
            </div>
          </div>

          {psychNotes.slice(0,5).map(n => (
            <div key={n.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", marginTop: 12 }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 8 }}>{new Date(n.date).toLocaleString("en-KE")}</div>
              <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {notify && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, letterSpacing: 2, borderRadius: 8, fontWeight: 500, zIndex: 999 }}>
          {notify}
        </div>
      )}

    </div>
  )
}

// MAIN DASHBOARD
export default 

function Dashboard() {
  const navigate = useNavigate()
  const [active,    setActive]    = useState("overview")
  const [user,      setUser]      = useState(null)
  const [summary,   setSummary]   = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [token,     setToken]     = useState(null)
  const [showMail,  setShowMail]  = useState(false)
  const [messages,  setMessages]  = useState([])
  const [unreadMail,setUnreadMail]= useState(0)
  const [topMt5Status, setTopMt5Status] = useState(null)

  useEffect(() => {
    const fetchTopMt5 = () => {
      api.get("/trading/status").then(r => setTopMt5Status(r.data)).catch(() => setTopMt5Status({ agent_connected: false }))
    }
    fetchTopMt5()
    const id = setInterval(fetchTopMt5, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const t = localStorage.getItem("pp_token")
    if (!t) { navigate("/login"); return }
    setToken(t)
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => navigate("/login"))
    api.get("/dashboard/summary").then(r => setSummary(r.data)).catch(() => {})
  }, [])

  const fetchMessages = () => {
    api.get("/notifications/messages").then(r => {
      setMessages(r.data)
      setUnreadMail(r.data.filter(m => !m.read).length)
    }).catch(() => {})
  }

  useEffect(() => {
    if (showMail) fetchMessages()
  }, [showMail])

  const markMessageRead = (id) => {
    api.patch("/notifications/messages/" + id + "/read").catch(() => {})
    setMessages(p => p.map(m => m.id === id ? {...m, read: true} : m))
    setUnreadMail(p => Math.max(0, p - 1))
  }

  const logout = () => { localStorage.removeItem("pp_token"); navigate("/login") }

  const plan = user?.subscription_plan || "free"

  const sections = {
    overview:    <Overview user={user} summary={summary} setActiveSection={setActive} />,
    mt5:         <MT5Connect />,
    strategy:    <Strategy />,
    intel:       <MarketIntel user={user} />,
    blog:        <UserBlog user={user} />,
    signal:      <LiveSignal userPlan={plan} />,
    backtest:    <Backtest userPlan={plan} />,
    trades:      <TradeHistory />,
    performance: <Performance summary={summary} userPlan={plan} />,
    learn:       <LearningHub />,
    journal:     canAccess(plan, "pro")
                   ? <TradingJournal />
                   : <TierGate required="pro" userPlan={plan} feature="Trading Journal" />,
    settings:    <Settings user={user} />,
    profile:     <Profile user={user} summary={summary} />,
    support:     <Support />,
  }

  // Show onboarding fullscreen before dashboard


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #171a20; overflow-x: hidden; }
        input::placeholder, textarea::placeholder { color: #5a6070; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #262c3a inset !important; -webkit-text-fill-color: #edeef0 !important; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a6070' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: C.sans }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: collapsed ? 60 : 218, minHeight: "100vh", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100, transition: "width 0.25s ease", overflow: "hidden" }}>

          {/* Logo */}
          <div style={{ padding: collapsed ? "18px 0" : "20px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={{ width: 30, height: 30, background: C.gold, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#000", flexShrink: 0 }}>P</div>
            {!collapsed && (
              <div>
                <div style={{ fontFamily: C.display, fontSize: 16, color: C.text, lineHeight: 1 }}>PesaPips</div>
                <div style={{ fontFamily: C.mono, fontSize: 8, color: C.gold, letterSpacing: "0.18em" }}>AI TRADING</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {NAV.map(item => {
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => setActive(item.id)} style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: 11, padding: collapsed ? "11px 0" : "10px 18px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? C.goldDim : "transparent",
                  border: "none", borderLeft: isActive ? `2px solid ${C.gold}` : "2px solid transparent",
                  color: isActive ? C.gold : C.text3,
                  fontFamily: C.sans, fontSize: 13, fontWeight: isActive ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = C.text2 } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text3 } }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && item.label}
                </button>
              )
            })}
          </div>

          {/* Bottom */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 0 8px" }}>

            {/* Admin link — only for admins */}
            {user?.is_admin && (
              <div style={{ padding: collapsed ? "0 8px" : "0 10px", marginBottom: 8 }}>
                <a href="/admin" style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)",
                  textDecoration: "none", transition: "all 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(212,168,67,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(212,168,67,0.08)"}
                >
                  <span style={{ fontSize: 14 }}>🛡</span>
                  {!collapsed && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.1em", fontWeight: 600 }}>ADMIN</span>}
                </a>
              </div>
            )}
            {/* Three icon buttons: Settings, Profile, Support */}
            <div style={{ display: "flex", justifyContent: collapsed ? "center" : "space-around", padding: collapsed ? "0" : "0 12px", marginBottom: 10 }}>
              {[
                { id: "settings", icon: "⚙", label: "Settings" },
                { id: "profile",  icon: "👤", label: "Profile"  },
                { id: "support",  icon: "🎧", label: "Support"  },
              ].map(btn => {
                const isActive = active === btn.id
                return (
                  <div key={btn.id} style={{ position: "relative" }}>
                    <button onClick={() => setActive(btn.id)}
                      title={btn.label}
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        border: `1px solid ${isActive ? C.gold : C.border2}`,
                        background: isActive ? C.goldDim : "transparent",
                        color: isActive ? C.gold : C.text3,
                        fontSize: 16, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text3 } }}
                    >{btn.icon}</button>
                    {!collapsed && (
                      <div style={{ textAlign: "center", fontFamily: C.mono, fontSize: 7, color: isActive ? C.gold : C.text3, letterSpacing: "0.08em", marginTop: 3 }}>{btn.label.toUpperCase()}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* User pill */}
            {!collapsed && (
              <div style={{ margin: "4px 10px 8px", padding: "9px 11px", background: C.surface2, borderRadius: 9, display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, #a07020)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: "#000", flexShrink: 0 }}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email?.split("@")[0] || "User"}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 8, color: C.gold, letterSpacing: "0.08em" }}>{(user?.subscription_plan || "FREE").toUpperCase()}</div>
                </div>
              </div>
            )}

            {/* Logout */}
            <button onClick={logout} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11,
              padding: collapsed ? "10px 0" : "8px 18px", justifyContent: collapsed ? "center" : "flex-start",
              background: "transparent", border: "none",
              color: C.text3, fontFamily: C.sans, fontSize: 13, cursor: "pointer", transition: "color 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = C.red}
              onMouseLeave={e => e.currentTarget.style.color = C.text3}
            >
              <span style={{ fontSize: 15 }}>⏻</span>
              {!collapsed && "Log out"}
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ marginLeft: collapsed ? 60 : 218, flex: 1, transition: "margin-left 0.25s ease", minWidth: 0 }}>

          {/* System status bar */}
          <div style={{ background: "#0f1117", borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {[
                { label: "API",            status: "operational" },
                { label: "Signal Engine",  status: "operational" },
                { label: "Market Data",    status: "operational" },
                { label: "MT5 Bridge",     status: topMt5Status?.agent_connected ? "operational" : topMt5Status === null ? "pending" : "offline" },
                { label: "Calendar",       status: "operational" },
                { label: "News Feed",      status: "operational" },
              ].map(s => {
                const col = s.status === "operational" ? C.green : s.status === "pending" ? C.gold : C.red
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: col, flexShrink: 0, animation: s.status === "operational" ? "pulse 3s infinite" : "none" }} />
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: col, letterSpacing: "0.06em" }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* Top bar with clocks */}
          <TopBar collapsed={collapsed} setCollapsed={setCollapsed} active={active} NAV={NAV} token={token} showMail={showMail} setShowMail={setShowMail} unreadMail={unreadMail} />

          {/* Ticker */}
          <TickerBar />

          {/* Content */}
          <div style={{ padding: "28px 32px", animation: "fadeUp 0.3s ease both" }} key={active}>
            <AnnouncementBanner />
            {sections[active] || sections.overview}
          </div>
        </div>
      </div>

      {/* Mail Slide-in Sidebar */}
      {showMail && (
        <>
          <div onClick={() => setShowMail(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: 0, right: 0, width: 420, height: "100vh", background: C.surface,
            borderLeft: `1px solid ${C.border}`, zIndex: 301, display: "flex", flexDirection: "column",
            animation: "fadeUp 0.2s ease" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.blue, letterSpacing: "0.12em", marginBottom: 2 }}>INBOX</div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>{unreadMail} unread</div>
              </div>
              <button onClick={() => setShowMail(false)} style={{ background: "none", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ padding: "60px 24px", textAlign: "center", fontFamily: C.sans, fontSize: 14, color: C.text3 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
                  No messages yet
                </div>
              ) : messages.map(m => (
                <div key={m.id} onClick={() => markMessageRead(m.id)} style={{
                  padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
                  background: m.read ? "transparent" : "rgba(91,156,246,0.04)",
                  cursor: "pointer", transition: "background 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: m.read ? 400 : 700, color: C.text }}>{m.subject}</div>
                    {!m.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 4 }} />}
                  </div>
                  <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginBottom: 6, fontStyle: "italic" }}>From: {m.from_name}</div>
                  <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{m.body}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 8 }}>{new Date(m.created_at).toLocaleString("en-KE")}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
