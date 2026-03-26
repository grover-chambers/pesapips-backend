import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import QuizManager from "../components/QuizManager";

const api = axios.create({ baseURL: "http://localhost:8000" })
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("pp_token")
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#0a0b0e",
  surface:  "#111318",
  surface2: "#181b22",
  surface3: "#1e2230",
  border:   "rgba(255,255,255,0.06)",
  border2:  "rgba(255,255,255,0.1)",
  text:     "#e8e8ec",
  text2:    "#9a9eb0",
  text3:    "#5a6070",
  gold:     "#d4a843",
  goldDim:  "rgba(212,168,67,0.1)",
  green:    "#3dd68c",
  greenDim: "rgba(61,214,140,0.1)",
  red:      "#f04f5a",
  redDim:   "rgba(240,79,90,0.1)",
  blue:     "#5b9cf6",
  blueDim:  "rgba(91,156,246,0.1)",
  orange:   "#f0934f",
  orangeDim:"rgba(240,147,79,0.1)",
  mono:     "'JetBrains Mono','Fira Mono',monospace",
  sans:     "'Inter','Segoe UI',sans-serif",
  display:  "'Syne','Space Grotesk',sans-serif",
}

const PRIORITY_COLOR = {
  low:      { c: C.text3,  d: "rgba(90,96,112,0.1)"  },
  medium:   { c: C.blue,   d: C.blueDim  },
  high:     { c: C.orange, d: C.orangeDim },
  critical: { c: C.red,    d: C.redDim   },
}
const STATUS_COLOR = {
  open:        { c: C.blue,   d: C.blueDim  },
  in_progress: { c: C.orange, d: C.orangeDim },
  resolved:    { c: C.green,  d: C.greenDim  },
  closed:      { c: C.text3,  d: "rgba(90,96,112,0.1)" },
}
const TYPE_COLOR = {
  bug:     { c: C.red,    d: C.redDim   },
  feature: { c: C.blue,   d: C.blueDim  },
  review:  { c: C.gold,   d: C.goldDim  },
  general: { c: C.text2,  d: "rgba(154,158,176,0.1)" },
  billing: { c: C.orange, d: C.orangeDim },
}
const PLAN_COLOR = {
  free:  C.text3,
  pro:   C.blue,
  elite: C.gold,
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function Badge({ label, color, dim }) {
  return (
    <span style={{ padding: "3px 8px", borderRadius: 4, background: dim, border: `1px solid ${color}30`, fontFamily: C.mono, fontSize: 9, color, letterSpacing: "0.1em", fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  )
}

function Stat({ label, value, sub, color = C.gold, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: C.display, fontSize: 28, color, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ data = [] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", height: Math.max(2, (d.count / max) * 36), background: d.count > 0 ? C.gold : C.surface3, borderRadius: 2, transition: "height 0.4s ease" }} />
        </div>
      ))}
    </div>
  )
}

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontFamily: C.display, fontSize: 18, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 18 }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.text3}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "10px 20px", background: "none", border: "none",
          borderBottom: active === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
          fontFamily: C.sans, fontSize: 13, fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? C.gold : C.text3, cursor: "pointer", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          {t.label}
          {t.count !== undefined && (
            <span style={{ padding: "1px 6px", borderRadius: 10, background: active === t.id ? C.goldDim : C.surface2, fontFamily: C.mono, fontSize: 9, color: active === t.id ? C.gold : C.text3 }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

const inputStyle = {
  width: "100%", padding: "9px 12px", background: C.surface2,
  border: `1px solid ${C.border2}`, borderRadius: 8,
  fontFamily: C.sans, fontSize: 13, color: C.text,
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
}
const btnGold = {
  padding: "9px 18px", background: C.gold, border: "none", borderRadius: 8,
  fontFamily: C.mono, fontSize: 11, letterSpacing: "0.1em", color: "#000",
  fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s",
}
const btnOutline = {
  padding: "9px 18px", background: "transparent", border: `1px solid ${C.border2}`,
  borderRadius: 8, fontFamily: C.mono, fontSize: 11, color: C.text2,
  cursor: "pointer", transition: "all 0.15s",
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/admin/metrics").then(r => setMetrics(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading metrics...</div>
  if (!metrics)  return <div style={{ textAlign: "center", padding: 60, color: C.red, fontFamily: C.mono, fontSize: 12 }}>Failed to load metrics</div>

  const { plan_counts, signups_7d } = metrics

  return (
    <div>
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 20 }}>COMMAND CENTRE</div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Stat label="TOTAL USERS"     value={metrics.total_users}  sub={`+${metrics.new_this_week} this week`} color={C.blue} />
        <Stat label="MRR (KES)"       value={`${(metrics.mrr_kes/1000).toFixed(1)}k`} sub={`${plan_counts.pro} Pro · ${plan_counts.elite} Elite`} color={C.gold} />
        <Stat label="OPEN TICKETS"    value={metrics.open_tickets} sub="Awaiting response"  color={metrics.open_tickets > 0 ? C.orange : C.green} />
        <Stat label="UNREAD FEEDBACK" value={metrics.unread_feedback} sub="Bugs · features · reviews" color={metrics.unread_feedback > 0 ? C.red : C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Stat label="TOTAL TRADES"  value={metrics.total_trades}  sub={`${metrics.trades_today} today`}   color={C.text2} />
        <Stat label="OPEN POSITIONS" value={metrics.open_trades}  sub="Live right now"                    color={metrics.open_trades > 0 ? C.green : C.text3} />
        <Stat label="NEW TODAY"     value={metrics.new_today}     sub="Signups"                            color={C.text2} />
        <Stat label="NEW THIS WEEK" value={metrics.new_this_week} sub="Last 7 days"                       color={C.text2} />
      </div>

      {/* Row 3 — Platform usage */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <Stat label="ACTIVE STRATEGIES" value={metrics.active_strategies ?? 0} sub="Running live now" color={C.green} />
        <Stat label="AUTORUN USERS"    value={metrics.autorun_users ?? 0}    sub="AI trading active" color={C.blue} />
        <Stat label="ONBOARDED"        value={metrics.onboarded_count ?? 0}  sub={`of ${metrics.total_users} total`} color={C.gold} />
        <Stat label="PLATINUM USERS"   value={metrics.plan_counts?.platinum ?? 0} sub="Top tier" color="#e2c4f0" />
      </div>

      {/* Row 4 — Top strategies + top assets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {/* Top strategies */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 18 }}>TOP STRATEGIES BY USAGE</div>
          {(metrics.top_strategies || []).length === 0 ? (
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>No data yet</div>
          ) : (metrics.top_strategies || []).map((s, i) => {
            const maxCount = metrics.top_strategies[0]?.count || 1
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{s.name}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.gold }}>{s.count}</span>
                </div>
                <div style={{ height: 4, background: C.surface2, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${(s.count/maxCount)*100}%`, background: C.gold, borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top assets */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 18 }}>MOST WATCHED ASSETS</div>
          {(metrics.top_assets || []).length === 0 ? (
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>No data yet</div>
          ) : (metrics.top_assets || []).map((a, i) => {
            const maxCount = metrics.top_assets[0]?.count || 1
            const colors = [C.gold, C.blue, C.green, "#a78bfa", "#f06b6b"]
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text2, fontWeight: 600 }}>{a.asset}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: colors[i] }}>{a.count} users</span>
                </div>
                <div style={{ height: 4, background: C.surface2, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${(a.count/maxCount)*100}%`, background: colors[i], borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan breakdown + signups chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Plan breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 18 }}>USER BREAKDOWN BY PLAN</div>
          {[
            { plan: "Free",  count: plan_counts.free,  color: C.text2,   pct: metrics.total_users > 0 ? plan_counts.free / metrics.total_users * 100 : 0 },
            { plan: "Pro",   count: plan_counts.pro,   color: C.blue,    pct: metrics.total_users > 0 ? plan_counts.pro  / metrics.total_users * 100 : 0 },
            { plan: "Elite",    count: plan_counts.elite,    color: C.gold,    pct: metrics.total_users > 0 ? plan_counts.elite   / metrics.total_users * 100 : 0 },
            { plan: "Platinum", count: plan_counts.platinum ?? 0, color: "#e2c4f0", pct: metrics.total_users > 0 ? (plan_counts.platinum ?? 0) / metrics.total_users * 100 : 0 },
          ].map(row => (
            <div key={row.plan} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: C.sans, fontSize: 13, color: C.text2 }}>{row.plan}</span>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: row.color }}>{row.count} users</span>
              </div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${row.pct}%`, background: row.color, borderRadius: 3, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Signups chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 18 }}>SIGNUPS — LAST 7 DAYS</div>
          <MiniBar data={signups_7d} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {signups_7d.map((d, i) => (
              <div key={i} style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, flex: 1, textAlign: "center" }}>{d.date.split(" ")[0]}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── USER MANAGEMENT ───────────────────────────────────────────────────────────
function UserManagement() {
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState("")
  const [planFilter, setPlan] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editPlan, setEditPlan] = useState("")
  const [newPw,   setNewPw]   = useState("")
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState("")

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 20 })
    if (search)     params.set("search", search)
    if (planFilter) params.set("plan", planFilter)
    api.get(`/admin/users?${params}`).then(r => {
      setUsers(r.data.users)
      setTotal(r.data.total)
      setPages(r.data.pages)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page, search, planFilter])

  useEffect(() => { load() }, [load])

  const openUser = async (u) => {
    setSelected(u)
    setEditPlan(u.subscription_plan)
    setNewPw("")
    setDetailLoading(true)
    try {
      const r = await api.get(`/admin/users/${u.id}`)
      setUserDetail(r.data)
    } catch {}
    finally { setDetailLoading(false) }
  }

  const saveUser = async () => {
    setSaving(true)
    try {
      await api.patch(`/admin/users/${selected.id}`, { subscription_plan: editPlan })
      showToast("Plan updated")
      load()
    } catch { showToast("Failed to update") }
    finally { setSaving(false) }
  }

  const toggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}`, { is_active: !u.is_active })
      showToast(u.is_active ? "User suspended" : "User reactivated")
      load()
    } catch { showToast("Failed") }
  }

  const resetPassword = async () => {
    if (newPw.length < 8) { showToast("Min 8 characters"); return }
    setSaving(true)
    try {
      await api.post(`/admin/users/${selected.id}/reset-password`, { new_password: newPw })
      showToast("Password reset successfully")
      setNewPw("")
    } catch { showToast("Failed to reset password") }
    finally { setSaving(false) }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by email or name..." style={{ ...inputStyle, flex: 1 }}
          onFocus={e => e.target.style.borderColor = C.gold}
          onBlur={e => e.target.style.borderColor = C.border2} />
        <select value={planFilter} onChange={e => { setPlan(e.target.value); setPage(1) }}
          style={{ ...inputStyle, width: 140 }}>
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
        <button onClick={load} style={{ ...btnOutline }}>↻ Refresh</button>
      </div>

      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 12 }}>
        {total} USERS · PAGE {page} OF {pages}
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 100px 80px", padding: "10px 16px", background: C.surface2, borderRadius: "8px 8px 0 0", border: `1px solid ${C.border}`, borderBottom: "none" }}>
        {["EMAIL / NAME", "PLAN", "TRADES", "POINTS", "JOINED", "ACTIONS"].map(h => (
          <div key={h} style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em" }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
        ) : users.map((u, i) => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 100px 80px", padding: "13px 16px", borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", background: u.is_active ? "transparent" : "rgba(240,79,90,0.03)", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
            onMouseLeave={e => e.currentTarget.style.background = u.is_active ? "transparent" : "rgba(240,79,90,0.03)"}
          >
            <div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text, marginBottom: 2 }}>{u.email}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {u.display_name && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{u.display_name}</span>}
                {u.is_admin && <Badge label="ADMIN" color={C.gold} dim={C.goldDim} />}
                {!u.is_active && <Badge label="SUSPENDED" color={C.red} dim={C.redDim} />}
              </div>
            </div>
            <div><Badge label={u.subscription_plan.toUpperCase()} color={PLAN_COLOR[u.subscription_plan]} dim={`${PLAN_COLOR[u.subscription_plan]}15`} /></div>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{u.trade_count}</div>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.gold }}>{u.points_balance}</div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => openUser(u)}
                style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "transparent", color: C.text2, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}>
                View
              </button>
              <button onClick={() => toggleActive(u)}
                style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${u.is_active ? C.red : C.green}30`, background: "transparent", color: u.is_active ? C.red : C.green, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}>
                {u.is_active ? "Ban" : "Unban"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${p === page ? C.gold : C.border2}`, background: p === page ? C.goldDim : "transparent", color: p === page ? C.gold : C.text3, fontFamily: C.mono, fontSize: 11, cursor: "pointer" }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* User detail modal */}
      {selected && (
        <Modal title={`User — ${selected.email}`} onClose={() => { setSelected(null); setUserDetail(null) }} width={680}>
          {detailLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
          ) : userDetail ? (
            <div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
                {[
                  { label: "PLAN",    value: userDetail.subscription_plan?.toUpperCase(), color: PLAN_COLOR[userDetail.subscription_plan] },
                  { label: "TRADES",  value: userDetail.trade_count,      color: C.text2 },
                  { label: "LESSONS", value: userDetail.completed_lessons, color: C.blue  },
                  { label: "POINTS",  value: userDetail.points_balance,   color: C.gold  },
                ].map(s => (
                  <div key={s.label} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontFamily: C.display, fontSize: 20, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Change plan */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 10 }}>CHANGE PLAN</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <select value={editPlan} onChange={e => setEditPlan(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                  </select>
                  <button onClick={saveUser} disabled={saving} style={{ ...btnGold, whiteSpace: "nowrap" }}>
                    {saving ? "Saving..." : "Update plan"}
                  </button>
                </div>
              </div>

              {/* Reset password */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 10 }}>RESET PASSWORD</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="New password (min 8 chars)" style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2} />
                  <button onClick={resetPassword} disabled={saving}
                    style={{ ...btnOutline, whiteSpace: "nowrap", borderColor: C.red + "50", color: C.red }}>
                    Reset
                  </button>
                </div>
              </div>

              {/* Recent tickets */}
              {userDetail.recent_tickets?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 10 }}>RECENT TICKETS</div>
                  {userDetail.recent_tickets.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: C.surface2, borderRadius: 6, marginBottom: 6 }}>
                      <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{t.subject}</span>
                      <Badge label={t.status.toUpperCase()} color={STATUS_COLOR[t.status]?.c || C.text3} dim={STATUS_COLOR[t.status]?.d || C.surface2} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// ── FEEDBACK INBOX ────────────────────────────────────────────────────────────
function FeedbackInbox() {
  const [items,    setItems]   = useState([])
  const [total,    setTotal]   = useState(0)
  const [filter,   setFilter]  = useState("all")
  const [readFilter, setRead]  = useState("all")
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 50 })
    if (filter !== "all") params.set("type", filter)
    if (readFilter === "unread") params.set("is_read", "false")
    if (readFilter === "read")   params.set("is_read", "true")
    api.get(`/admin/feedback?${params}`).then(r => {
      setItems(r.data.items || [])
      setTotal(r.data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [filter, readFilter])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    await api.patch(`/admin/feedback/${id}/read`)
    setItems(p => p.map(i => i.id === id ? { ...i, is_read: true } : i))
  }

  const TYPE_ICON = { bug: "🐛", feature: "💡", review: "⭐", general: "💬", billing: "💳" }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: 16 }}>
      {/* List */}
      <div>
        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["all","bug","feature","review","general"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter === f ? C.gold : C.border2}`, background: filter === f ? C.goldDim : "transparent", color: filter === f ? C.gold : C.text3, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.1em", cursor: "pointer" }}>
              {f.toUpperCase()}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {["all","unread","read"].map(f => (
              <button key={f} onClick={() => setRead(f)}
                style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${readFilter === f ? C.blue : C.border2}`, background: readFilter === f ? C.blueDim : "transparent", color: readFilter === f ? C.blue : C.text3, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 10 }}>{total} ITEMS</div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📭</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No feedback yet</div>
          </div>
        ) : items.map(item => {
          const tc = TYPE_COLOR[item.type] || TYPE_COLOR.general
          const data = typeof item.data === "string" ? (() => { try { return JSON.parse(item.data) } catch { return {} } })() : (item.data || {})
          return (
            <div key={item.id} onClick={() => { setSelected(item); if (!item.is_read) markRead(item.id) }}
              style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${selected?.id === item.id ? C.gold + "40" : C.border}`, background: selected?.id === item.id ? C.goldDim : item.is_read ? "transparent" : C.surface, marginBottom: 8, cursor: "pointer", transition: "all 0.15s", opacity: item.is_read ? 0.7 : 1 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.gold + "30"}
              onMouseLeave={e => e.currentTarget.style.borderColor = selected?.id === item.id ? C.gold + "40" : C.border}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{TYPE_ICON[item.type] || "💬"}</span>
                  <Badge label={item.type?.toUpperCase()} color={tc.c} dim={tc.d} />
                  {!item.is_read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue }} />}
                </div>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                </span>
              </div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3 }}>{item.user_email}</div>
              {data.title && <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, marginTop: 4 }}>{data.title}</div>}
              {data.what_happened && <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.what_happened}</div>}
              {data.body && <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.body}</div>}
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (() => {
        const data = typeof selected.data === "string" ? (() => { try { return JSON.parse(selected.data) } catch { return {} } })() : (selected.data || {})
        const tc   = TYPE_COLOR[selected.type] || TYPE_COLOR.general
        return (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px", position: "sticky", top: 20, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Badge label={selected.type?.toUpperCase()} color={tc.c} dim={tc.d} />
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginBottom: 4 }}>FROM</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text, marginBottom: 16 }}>{selected.user_email}</div>
            {Object.entries(data).filter(([k]) => !["type"].includes(k)).map(([k, v]) => v ? (
              <div key={k} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>{k.toUpperCase().replace(/_/g, " ")}</div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6, background: C.surface2, padding: "10px 12px", borderRadius: 8 }}>{String(v)}</div>
              </div>
            ) : null)}
            <a href={`mailto:${selected.user_email}?subject=Re: Your ${selected.type} report`}
              style={{ display: "block", marginTop: 16, padding: "9px 18px", background: C.goldDim, border: `1px solid ${C.gold}30`, borderRadius: 8, fontFamily: C.mono, fontSize: 10, color: C.gold, textAlign: "center", textDecoration: "none", letterSpacing: "0.1em" }}>
              Reply via email →
            </a>
          </div>
        )
      })()}
    </div>
  )
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
function Reviews() {
  const [reviews,  setReviews]  = useState([])
  const [filter,   setFilter]   = useState("all")
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState("")

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter === "approved")   params.set("approved", "true")
    if (filter === "unapproved") params.set("approved", "false")
    api.get(`/admin/reviews?${params}`).then(r => setReviews(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const approve = async (id, approved) => {
    await api.patch(`/admin/reviews/${id}/approve`, { approved })
    showToast(approved ? "Review approved — will show on landing page" : "Review rejected")
    load()
  }

  const STARS = n => "⭐".repeat(parseInt(n) || 0)

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "unapproved", "approved"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${filter === f ? C.gold : C.border2}`, background: filter === f ? C.goldDim : "transparent", color: filter === f ? C.gold : C.text3, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.1em", cursor: "pointer" }}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⭐</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No reviews yet</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {reviews.map(r => {
            const data = typeof r.data === "string" ? (() => { try { return JSON.parse(r.data) } catch { return {} } })() : (r.data || {})
            return (
              <div key={r.id} style={{ background: C.surface, border: `1px solid ${r.is_approved ? C.green + "30" : C.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{data.reviewer_name || r.user_email}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge label={(data.plan || "free").toUpperCase()} color={PLAN_COLOR[data.plan] || C.text3} dim={`${PLAN_COLOR[data.plan] || C.text3}15`} />
                      {data.trading_since && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{data.trading_since}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{STARS(data.rating)}</div>
                    {r.is_approved
                      ? <Badge label="APPROVED" color={C.green} dim={C.greenDim} />
                      : <Badge label="PENDING"  color={C.orange} dim={C.orangeDim} />}
                  </div>
                </div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 14 }}>{data.body || "—"}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!r.is_approved ? (
                    <button onClick={() => approve(r.id, true)} style={{ ...btnGold, padding: "6px 14px", fontSize: 10 }}>✓ Approve</button>
                  ) : (
                    <button onClick={() => approve(r.id, false)} style={{ ...btnOutline, padding: "6px 14px", fontSize: 10, color: C.red, borderColor: C.red + "40" }}>Reject</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────────
function Tickets() {
  const [tickets,  setTickets]  = useState([])
  const [total,    setTotal]    = useState(0)
  const [selected, setSelected] = useState(null)
  const [detail,   setDetail]   = useState(null)
  const [note,     setNote]     = useState("")
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState("")
  const [statusFilter, setStatus] = useState("")
  const [priorityFilter, setPri]  = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newTicket, setNewTicket]   = useState({ subject: "", body: "", type: "general", priority: "medium" })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 30 })
    if (statusFilter)   params.set("status", statusFilter)
    if (priorityFilter) params.set("priority", priorityFilter)
    api.get(`/admin/tickets?${params}`).then(r => {
      setTickets(r.data.tickets || [])
      setTotal(r.data.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [statusFilter, priorityFilter])

  useEffect(() => { load() }, [load])

  const openTicket = async (t) => {
    setSelected(t)
    setNote("")
    try {
      const r = await api.get(`/admin/tickets/${t.id}`)
      setDetail(r.data)
    } catch {}
  }

  const updateTicket = async (id, payload) => {
    await api.patch(`/admin/tickets/${id}`, payload)
    showToast("Ticket updated")
    load()
    if (detail?.id === id) {
      const r = await api.get(`/admin/tickets/${id}`)
      setDetail(r.data)
    }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await api.post(`/admin/tickets/${selected.id}/notes`, { body: note })
      setNote("")
      showToast("Note added")
      const r = await api.get(`/admin/tickets/${selected.id}`)
      setDetail(r.data)
    } catch { showToast("Failed") }
    finally { setSaving(false) }
  }

  const PRIORITY_ICON = { low: "▽", medium: "◇", high: "△", critical: "▲" }

  return (
    <div>
      {/* Filters + create */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={e => setPri(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={load} style={{ ...btnOutline }}>↻</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCreate(true)} style={{ ...btnGold }}>+ New ticket</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "360px 1fr" : "1fr", gap: 16 }}>
        {/* Ticket list */}
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 10 }}>{total} TICKETS</div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🎫</div>
              <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No tickets</div>
            </div>
          ) : tickets.map(t => {
            const sc = STATUS_COLOR[t.status]   || STATUS_COLOR.open
            const pc = PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.medium
            return (
              <div key={t.id} onClick={() => openTicket(t)}
                style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${selected?.id === t.id ? C.gold + "40" : C.border}`, background: selected?.id === t.id ? C.goldDim : "transparent", marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = selected?.id === t.id ? C.goldDim : C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = selected?.id === t.id ? C.goldDim : "transparent"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge label={t.status.replace("_"," ").toUpperCase()} color={sc.c} dim={sc.d} />
                    <Badge label={`${PRIORITY_ICON[t.priority]} ${t.priority.toUpperCase()}`} color={pc.c} dim={pc.d} />
                    <Badge label={t.type.toUpperCase()} color={TYPE_COLOR[t.type]?.c || C.text3} dim={TYPE_COLOR[t.type]?.d || C.surface2} />
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, whiteSpace: "nowrap", marginLeft: 8 }}>#{t.id}</span>
                </div>
                <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{t.subject}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{t.user_email}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {t.note_count > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>💬 {t.note_count}</span>}
                    {t.assigned_to && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.blue }}>→ {t.assigned_to.split("@")[0]}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Ticket detail */}
        {selected && detail && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px", maxHeight: "82vh", overflowY: "auto", position: "sticky", top: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontFamily: C.display, fontSize: 16, color: C.text, flex: 1, marginRight: 12 }}>{detail.subject}</div>
              <button onClick={() => { setSelected(null); setDetail(null) }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge label={detail.status.replace("_"," ").toUpperCase()} color={STATUS_COLOR[detail.status]?.c || C.text3} dim={STATUS_COLOR[detail.status]?.d || C.surface2} />
              <Badge label={detail.priority.toUpperCase()} color={PRIORITY_COLOR[detail.priority]?.c || C.text3} dim={PRIORITY_COLOR[detail.priority]?.d || C.surface2} />
              <Badge label={detail.type.toUpperCase()} color={TYPE_COLOR[detail.type]?.c || C.text3} dim={TYPE_COLOR[detail.type]?.d || C.surface2} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{detail.user_email} · {detail.user_plan?.toUpperCase()}</span>
            </div>

            <div style={{ background: C.surface2, borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.7 }}>{detail.body}</div>

            {/* Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 6 }}>STATUS</div>
                <select defaultValue={detail.status} onChange={e => updateTicket(detail.id, { status: e.target.value })}
                  style={{ ...inputStyle }}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 6 }}>PRIORITY</div>
                <select defaultValue={detail.priority} onChange={e => updateTicket(detail.id, { priority: e.target.value })}
                  style={{ ...inputStyle }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <a href={`mailto:${detail.user_email}?subject=Re: ${detail.subject}`}
              style={{ display: "block", padding: "8px 14px", background: C.blueDim, border: `1px solid ${C.blue}30`, borderRadius: 8, fontFamily: C.mono, fontSize: 10, color: C.blue, textAlign: "center", textDecoration: "none", marginBottom: 20 }}>
              Reply via email →
            </a>

            {/* Notes */}
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 12 }}>INTERNAL NOTES ({detail.notes?.length || 0})</div>
            {detail.notes?.map(n => (
              <div key={n.id} style={{ background: C.surface2, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, marginBottom: 6 }}>{n.admin} · {n.created_at ? new Date(n.created_at).toLocaleDateString() : "—"}</div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{n.body}</div>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Add an internal note..." style={{ ...inputStyle, resize: "vertical" }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
              <button onClick={addNote} disabled={saving || !note.trim()} style={{ ...btnGold, marginTop: 8, width: "100%", opacity: !note.trim() ? 0.5 : 1 }}>
                {saving ? "Adding..." : "Add note"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create ticket modal */}
      {showCreate && (
        <Modal title="Create Ticket" onClose={() => setShowCreate(false)}>
          {["subject","body"].map(k => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{k.toUpperCase()}</div>
              {k === "body" ? (
                <textarea value={newTicket[k]} onChange={e => setNewTicket(p => ({...p, [k]: e.target.value}))}
                  rows={4} style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              ) : (
                <input value={newTicket[k]} onChange={e => setNewTicket(p => ({...p, [k]: e.target.value}))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              )}
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[["type",["general","bug","feature","billing"]], ["priority",["low","medium","high","critical"]]].map(([k, opts]) => (
              <div key={k}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{k.toUpperCase()}</div>
                <select value={newTicket[k]} onChange={e => setNewTicket(p => ({...p, [k]: e.target.value}))} style={inputStyle}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowCreate(false)} style={btnOutline}>Cancel</button>
            <button onClick={async () => {
              await api.post("/support/tickets", newTicket)
              setShowCreate(false)
              setNewTicket({ subject: "", body: "", type: "general", priority: "medium" })
              load()
              showToast("Ticket created")
            }} style={btnGold}>Create ticket</button>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
function Announcements() {
  const [items,  setItems]  = useState([])
  const [show,   setShow]   = useState(false)
  const [form,   setForm]   = useState({ title: "", body: "", type: "info", target_plan: "all", expires_at: "" })
  const [toast,  setToast]  = useState("")
  const [loading,setLoading]= useState(true)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = () => {
    setLoading(true)
    api.get("/admin/announcements").then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await api.post("/admin/announcements", form)
    setShow(false)
    setForm({ title: "", body: "", type: "info", target_plan: "all", expires_at: "" })
    showToast("Announcement published")
    load()
  }

  const toggle = async (id, is_active) => {
    await api.patch(`/admin/announcements/${id}`, { is_active })
    showToast(is_active ? "Announcement activated" : "Announcement deactivated")
    load()
  }

  const del = async (id) => {
    if (!window.confirm("Delete this announcement?")) return
    await api.delete(`/admin/announcements/${id}`)
    showToast("Deleted")
    load()
  }

  const TYPE_CONFIG = {
    info:     { color: C.blue,   label: "INFO"    },
    warning:  { color: C.orange, label: "WARNING" },
    success:  { color: C.green,  label: "SUCCESS" },
    critical: { color: C.red,    label: "CRITICAL"},
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={() => setShow(true)} style={btnGold}>+ New announcement</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📢</div>
          <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text3 }}>No announcements yet</div>
        </div>
      ) : items.map(a => {
        const tc = TYPE_CONFIG[a.type] || TYPE_CONFIG.info
        return (
          <div key={a.id} style={{ background: C.surface, border: `1px solid ${a.is_active ? tc.color + "30" : C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12, opacity: a.is_active ? 1 : 0.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge label={tc.label} color={tc.color} dim={`${tc.color}15`} />
                <Badge label={`→ ${a.target_plan.toUpperCase()}`} color={C.text3} dim="rgba(90,96,112,0.1)" />
                {!a.is_active && <Badge label="INACTIVE" color={C.text3} dim="rgba(90,96,112,0.1)" />}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggle(a.id, !a.is_active)}
                  style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${a.is_active ? C.border2 : C.green + "40"}`, background: "transparent", color: a.is_active ? C.text3 : C.green, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}>
                  {a.is_active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => del(a.id)}
                  style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}>
                  Delete
                </button>
              </div>
            </div>
            <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{a.title}</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 8 }}>{a.body}</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
              {a.created_at ? new Date(a.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
            </div>
          </div>
        )
      })}

      {show && (
        <Modal title="New Announcement" onClose={() => setShow(false)}>
          {[["TITLE","title","text"],["BODY","body","textarea"]].map(([label, key, type]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{label}</div>
              {type === "textarea" ? (
                <textarea value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              ) : (
                <input value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              )}
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>TYPE</div>
              <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} style={inputStyle}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>TARGET PLAN</div>
              <select value={form.target_plan} onChange={e => setForm(p => ({...p, target_plan: e.target.value}))} style={inputStyle}>
                <option value="all">All users</option>
                <option value="free">Free only</option>
                <option value="pro">Pro only</option>
                <option value="elite">Elite only</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>EXPIRES AT (optional)</div>
            <input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({...p, expires_at: e.target.value}))}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={e => e.target.style.borderColor = C.gold}
              onBlur={e => e.target.style.borderColor = C.border2} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShow(false)} style={btnOutline}>Cancel</button>
            <button onClick={create} style={btnGold}>Publish</button>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// ── COURSE MANAGEMENT ─────────────────────────────────────────────────────────
function CourseManagement() {
  const [modules, setModules] = useState([])
  const [stats,   setStats]   = useState([])
  const [view,    setView]    = useState("stats") // stats | manage
  const [loading, setLoading] = useState(true)
  const [showMod, setShowMod] = useState(false)
  const [showLes, setShowLes] = useState(null)
  const [modForm, setModForm] = useState({ title: "", description: "", track: "basics", tier_required: "free", order: 0, is_published: true })
  const [lesForm, setLesForm] = useState({ title: "", content: "", duration: "", order: 0, is_published: true })
  const [toast,   setToast]   = useState("")

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = async () => {
    setLoading(true)
    const [modR, statR] = await Promise.all([
      api.get("/courses/admin/modules").catch(() => ({ data: [] })),
      api.get("/admin/courses/stats").catch(() => ({ data: [] })),
    ])
    setModules(modR.data)
    setStats(statR.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createModule = async () => {
    await api.post("/courses/admin/modules", modForm)
    setShowMod(false)
    showToast("Module created")
    load()
  }

  const createLesson = async () => {
    await api.post(`/courses/admin/modules/${showLes}/lessons`, lesForm)
    setShowLes(null)
    showToast("Lesson added")
    load()
  }

  const togglePublish = async (id, is_published) => {
    await api.patch(`/courses/admin/modules/${id}`, { is_published: !is_published })
    showToast(is_published ? "Module unpublished" : "Module published")
    load()
  }

  const deleteModule = async (id) => {
    if (!window.confirm("Delete this module and all its lessons?")) return
    await api.delete(`/courses/admin/modules/${id}`)
    showToast("Module deleted")
    load()
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["stats","manage"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${view === v ? C.gold : C.border2}`, background: view === v ? C.goldDim : "transparent", color: view === v ? C.gold : C.text3, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.1em", cursor: "pointer" }}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={() => setShowMod(true)} style={btnGold}>+ New module</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
      ) : view === "stats" ? (
        // Stats view
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stats.map(m => (
            <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Badge label={m.track.toUpperCase()} color={m.track === "basics" ? C.green : C.gold} dim={m.track === "basics" ? C.greenDim : C.goldDim} />
                    <Badge label={m.tier_required.toUpperCase()} color={PLAN_COLOR[m.tier_required] || C.text3} dim={`${PLAN_COLOR[m.tier_required] || C.text3}15`} />
                    {!m.is_published && <Badge label="DRAFT" color={C.text3} dim="rgba(90,96,112,0.1)" />}
                  </div>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{m.lesson_count} lessons</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {m.lessons?.map(l => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.surface2, borderRadius: 7 }}>
                    <span style={{ fontFamily: C.sans, fontSize: 12, color: C.text2 }}>{l.title}</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {l.quiz_count > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold }}>{l.quiz_count} quiz</span>}
                      <button 
                        onClick={() => {
                          setSelectedLesson(l);
                          setShowQuizModal(true);
                        }}
                        style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #d4a84340", background: "transparent", color: "#d4a843", fontSize: 9, cursor: "pointer" }}
                      >
                        Manage Quizzes
                      </button>
                      <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green }}>{l.completions} completions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Manage view
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {modules.map(m => (
            <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge label={m.track.toUpperCase()} color={m.track === "basics" ? C.green : C.gold} dim={m.track === "basics" ? C.greenDim : C.goldDim} />
                    <Badge label={`${m.lesson_count} lessons`} color={C.text3} dim="rgba(90,96,112,0.1)" />
                    <Badge label={m.is_published ? "LIVE" : "DRAFT"} color={m.is_published ? C.green : C.text3} dim={m.is_published ? C.greenDim : "rgba(90,96,112,0.1)"} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowLes(m.id)}
                    style={{ ...btnOutline, padding: "5px 12px", fontSize: 10 }}>+ Lesson</button>
                  <button onClick={() => togglePublish(m.id, m.is_published)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${m.is_published ? C.orange + "40" : C.green + "40"}`, background: "transparent", color: m.is_published ? C.orange : C.green, fontFamily: C.mono, fontSize: 10, cursor: "pointer" }}>
                    {m.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => deleteModule(m.id)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 10, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New module modal */}
      {showMod && (
        <Modal title="Create Module" onClose={() => setShowMod(false)}>
          {[["TITLE","title"],["DESCRIPTION","description"]].map(([label, key]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{label}</div>
              <input value={modForm[key]} onChange={e => setModForm(p => ({...p, [key]: e.target.value}))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12, marginBottom: 20 }}>
            {[["TRACK","track",["basics","coursework"]], ["TIER","tier_required",["free","pro","elite"]]].map(([label, key, opts]) => (
              <div key={key}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{label}</div>
                <select value={modForm[key]} onChange={e => setModForm(p => ({...p, [key]: e.target.value}))} style={inputStyle}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>ORDER</div>
              <input type="number" value={modForm.order} onChange={e => setModForm(p => ({...p, order: parseInt(e.target.value)}))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowMod(false)} style={btnOutline}>Cancel</button>
            <button onClick={createModule} style={btnGold}>Create</button>
          </div>
        </Modal>
      )}

      {showQuizModal && selectedLesson && (
        <QuizManager 
          lesson={selectedLesson}
          onClose={() => {
            setShowQuizModal(false);
            setSelectedLesson(null);
          }}
          api={api}
          showToast={showToast}
        />
      )}

      {/* New lesson modal */}
      {showLes && (
        <Modal title="Add Lesson" onClose={() => setShowLes(null)} width={640}>
          {[["TITLE","title"],["DURATION","duration"],["CONTENT (Markdown)","content"]].map(([label, key]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 7 }}>{label}</div>
              {key === "content" ? (
                <textarea value={lesForm[key]} onChange={e => setLesForm(p => ({...p, [key]: e.target.value}))}
                  rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: C.mono, fontSize: 12 }}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              ) : (
                <input value={lesForm[key]} onChange={e => setLesForm(p => ({...p, [key]: e.target.value}))}
                  placeholder={key === "duration" ? "e.g. 5 min" : ""}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowLes(null)} style={btnOutline}>Cancel</button>
            <button onClick={createLesson} style={btnGold}>Add lesson</button>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}


// ── STRATEGY LIBRARY ─────────────────────────────────────────────────────────
function StrategyLibrary() {
  const [strategies, setStrategies] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editStrat,  setEditStrat]  = useState(null)
  const [toast,      setToast]      = useState("")
  const [form,       setForm]       = useState({
    name: "", description: "",
    tier_required: "free", category: "trend", timeframe: "M5",
    indicators: ["EMA","RSI","MACD"],
    ema_fast: 9, ema_mid: 21, ema_slow: 50,
    rsi_period: 14, rsi_buy: 35, rsi_sell: 65,
    macd_fast: 12, macd_slow: 26, macd_signal: 9,
    bb_period: 20, bb_std: 2.0,
    risk_per_trade: 1.0, sl_pips: 15, tp_pips: 30,
    is_public: true,
  })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const load = () => {
    setLoading(true)
    api.get("/strategies/").then(r => setStrategies(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const INDICATORS = ["EMA","RSI","MACD","BOLLINGER","STOCH","ATR","CCI"]
  const TIER_COLOR = { free: C.text2, pro: C.blue, elite: C.gold }
  const CAT_COLOR  = { trend: C.blue, breakout: C.orange, reversal: C.green, combo: C.gold, scalping: C.red, news: "#a78bfa" }

  const toggleIndicator = ind => {
    setForm(p => ({
      ...p,
      indicators: p.indicators.includes(ind)
        ? p.indicators.filter(i => i !== ind)
        : [...p.indicators, ind]
    }))
  }

  const openCreate = () => {
    setEditStrat(null)
    setForm({
      name: "", description: "",
      tier_required: "free", category: "trend", timeframe: "M5",
      indicators: ["EMA","RSI","MACD"],
      ema_fast: 9, ema_mid: 21, ema_slow: 50,
      rsi_period: 14, rsi_buy: 35, rsi_sell: 65,
      macd_fast: 12, macd_slow: 26, macd_signal: 9,
      bb_period: 20, bb_std: 2.0,
      risk_per_trade: 1.0, sl_pips: 15, tp_pips: 30,
      is_public: true,
    })
    setShowForm(true)
  }

  const openEdit = (s) => {
    setEditStrat(s)
    const dp = s.default_params || {}
    setForm({
      name:           s.name,
      description:    s.description || "",
      tier_required:  dp.tier_required  || "free",
      category:       dp.category       || "trend",
      timeframe:      dp.timeframe      || "M5",
      indicators:     dp.indicators     || ["EMA","RSI","MACD"],
      ema_fast:       dp.ema_fast       || 9,
      ema_mid:        dp.ema_mid        || 21,
      ema_slow:       dp.ema_slow       || 50,
      rsi_period:     dp.rsi_period     || 14,
      rsi_buy:        dp.rsi_buy        || 35,
      rsi_sell:       dp.rsi_sell       || 65,
      macd_fast:      dp.macd_fast      || 12,
      macd_slow:      dp.macd_slow      || 26,
      macd_signal:    dp.macd_signal    || 9,
      bb_period:      dp.bb_period      || 20,
      bb_std:         dp.bb_std         || 2.0,
      risk_per_trade: dp.risk_per_trade || 1.0,
      sl_pips:        dp.sl_pips        || 15,
      tp_pips:        dp.tp_pips        || 30,
      is_public:      s.is_public !== false,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) { showToast("Name is required"); return }
    const payload = {
      name:        form.name,
      description: form.description,
      is_public:   form.is_public,
      default_params: {
        indicators:     form.indicators,
        tier_required:  form.tier_required,
        category:       form.category,
        timeframe:      form.timeframe,
        ema_fast:       Number(form.ema_fast),
        ema_mid:        Number(form.ema_mid),
        ema_slow:       Number(form.ema_slow),
        rsi_period:     Number(form.rsi_period),
        rsi_buy:        Number(form.rsi_buy),
        rsi_sell:       Number(form.rsi_sell),
        macd_fast:      Number(form.macd_fast),
        macd_slow:      Number(form.macd_slow),
        macd_signal:    Number(form.macd_signal),
        bb_period:      Number(form.bb_period),
        bb_std:         Number(form.bb_std),
        risk_per_trade: Number(form.risk_per_trade),
        sl_pips:        Number(form.sl_pips),
        tp_pips:        Number(form.tp_pips),
      }
    }
    try {
      if (editStrat) {
        await api.patch(`/admin/strategies/${editStrat.id}`, payload)
        showToast("Strategy updated")
      } else {
        await api.post("/admin/strategies", payload)
        showToast("Strategy created")
      }
      setShowForm(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to save")
    }
  }

  const deleteStrat = async (id) => {
    if (!window.confirm("Delete this strategy? Users who applied it keep their copy.")) return
    await api.delete(`/admin/strategies/${id}`)
    showToast("Deleted")
    load()
  }

  const iLabel = label => (
    <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
  )

  const numField = (label, key, step=1) => (
    <div>
      {iLabel(label)}
      <input type="number" step={step} value={form[key]}
        onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
        style={{ ...inputStyle }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.border2} />
    </div>
  )

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={openCreate} style={btnGold}>+ New strategy</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {strategies.map(s => {
            const dp = s.default_params || {}
            const tier = dp.tier_required || "free"
            const cat  = dp.category || "trend"
            const inds = dp.indicators || []
            return (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge label={tier.toUpperCase()} color={TIER_COLOR[tier] || C.text3} dim={`${TIER_COLOR[tier] || C.text3}15`} />
                      <Badge label={cat.toUpperCase()} color={CAT_COLOR[cat] || C.text3} dim={`${CAT_COLOR[cat] || C.text3}15`} />
                      <Badge label={dp.timeframe || "M5"} color={C.text3} dim="rgba(90,96,112,0.1)" />
                      {!s.is_public && <Badge label="HIDDEN" color={C.red} dim={C.redDim} />}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(s)}
                      style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "transparent", color: C.text2, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}>
                      Edit
                    </button>
                    <button onClick={() => deleteStrat(s.id)}
                      style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, fontFamily: C.mono, fontSize: 9, cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginBottom: 12, lineHeight: 1.5 }}>{s.description}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {inds.map(ind => (
                    <span key={ind} style={{ padding: "2px 8px", borderRadius: 4, background: C.surface2, border: `1px solid ${C.border2}`, fontFamily: C.mono, fontSize: 9, color: C.text2 }}>{ind}</span>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 16, fontFamily: C.mono, fontSize: 9, color: C.text3 }}>
                  <span>SL: {dp.sl_pips} pips</span>
                  <span>TP: {dp.tp_pips} pips</span>
                  <span>Risk: {dp.risk_per_trade}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal title={editStrat ? `Edit — ${editStrat.name}` : "New Strategy"} onClose={() => setShowForm(false)} width={720}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              {iLabel("STRATEGY NAME")}
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="e.g. EMA RSI MACD Classic"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              {iLabel("DESCRIPTION")}
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                rows={2} style={{ ...inputStyle, resize: "vertical" }}
                onFocus={e => e.target.style.borderColor = C.gold}
                onBlur={e => e.target.style.borderColor = C.border2} />
            </div>
            <div>
              {iLabel("TIER REQUIRED")}
              <select value={form.tier_required} onChange={e => setForm(p => ({...p, tier_required: e.target.value}))} style={inputStyle}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div>
              {iLabel("CATEGORY")}
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} style={inputStyle}>
                {["trend","breakout","reversal","combo","scalping","news"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {iLabel("DEFAULT TIMEFRAME")}
              <select value={form.timeframe} onChange={e => setForm(p => ({...p, timeframe: e.target.value}))} style={inputStyle}>
                {["M1","M5","M15","M30","H1","H4","D1"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              {iLabel("VISIBILITY")}
              <select value={form.is_public ? "public" : "hidden"} onChange={e => setForm(p => ({...p, is_public: e.target.value === "public"}))} style={inputStyle}>
                <option value="public">Public — visible to users</option>
                <option value="hidden">Hidden — admin only</option>
              </select>
            </div>
          </div>

          {/* Indicators */}
          <div style={{ marginBottom: 16 }}>
            {iLabel("INDICATORS (select all that apply)")}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {INDICATORS.map(ind => (
                <button key={ind} onClick={() => toggleIndicator(ind)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${form.indicators.includes(ind) ? C.gold : C.border2}`, background: form.indicators.includes(ind) ? C.goldDim : "transparent", color: form.indicators.includes(ind) ? C.gold : C.text3, fontFamily: C.mono, fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Params grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {form.indicators.includes("EMA") && <>{numField("EMA FAST", "ema_fast")} {numField("EMA MID", "ema_mid")} {numField("EMA SLOW", "ema_slow")}</>}
            {form.indicators.includes("RSI") && <>{numField("RSI PERIOD", "rsi_period")} {numField("RSI BUY", "rsi_buy")} {numField("RSI SELL", "rsi_sell")}</>}
            {form.indicators.includes("MACD") && <>{numField("MACD FAST", "macd_fast")} {numField("MACD SLOW", "macd_slow")} {numField("MACD SIGNAL", "macd_signal")}</>}
            {form.indicators.includes("BOLLINGER") && <>{numField("BB PERIOD", "bb_period")} {numField("BB STD", "bb_std", 0.1)}</>}
            {numField("RISK %", "risk_per_trade", 0.1)}
            {numField("SL PIPS", "sl_pips")}
            {numField("TP PIPS", "tp_pips")}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={btnOutline}>Cancel</button>
            <button onClick={save} style={btnGold}>{editStrat ? "Save changes" : "Create strategy"}</button>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: C.gold, color: "#000", padding: "12px 20px", fontFamily: C.mono, fontSize: 11, borderRadius: 8, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────────────────────

// MESSAGING
function Messaging() {
  const [users,     setUsers]     = useState([])
  const [subject,   setSubject]   = useState("")
  const [body,      setBody]      = useState("")
  const [fromName,  setFromName]  = useState("PesaPips Team")
  const [target,    setTarget]    = useState("all")  // "all" or user id
  const [type,      setType]      = useState("info")
  const [sending,   setSending]   = useState(false)
  const [status,    setStatus]    = useState("")
  const [sent,      setSent]      = useState([])
  const [tab,       setTab]       = useState("compose")

  useEffect(() => {
    api.get("/admin/users-list").then(r => setUsers(r.data)).catch(() => {})
    api.get("/admin/messages/sent").then(r => setSent(r.data)).catch(() => {})
  }, [])

  const sendMessage = async () => {
    if (!subject.trim() || !body.trim()) { setStatus("error"); return }
    setSending(true); setStatus("")
    try {
      const payload = { subject, body, from_name: fromName,
                        user_id: target === "all" ? null : parseInt(target) }
      await api.post("/admin/messages/send", payload)
      setStatus("sent")
      setSubject(""); setBody("")
      api.get("/admin/messages/sent").then(r => setSent(r.data)).catch(() => {})
    } catch(e) { setStatus("error") }
    setSending(false)
  }

  const sendNotification = async () => {
    if (!subject.trim() || !body.trim()) { setStatus("error"); return }
    setSending(true); setStatus("")
    try {
      const payload = { title: subject, message: body, type,
                        user_id: target === "all" ? null : parseInt(target) }
      await api.post("/admin/notifications/send", payload)
      setStatus("sent")
      setSubject(""); setBody("")
    } catch(e) { setStatus("error") }
    setSending(false)
  }

  const inStyle = { width: "100%", background: C.surface2, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 14px", fontFamily: C.sans, fontSize: 13,
    color: C.text, outline: "none" }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {[["compose", "✉ Compose Message"], ["notify", "🔔 Send Notification"], ["sent", "📤 Sent History"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: tab === id ? `2px solid ${C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: tab === id ? 600 : 400,
            color: tab === id ? C.gold : C.text3, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {/* Compose / Notify form */}
      {(tab === "compose" || tab === "notify") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recipient */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>RECIPIENT</div>
            <select value={target} onChange={e => setTarget(e.target.value)} style={inStyle}>
              <option value="all">📢 Broadcast to all users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email} ({u.subscription_plan})</option>
              ))}
            </select>
          </div>

          {/* From name */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>FROM</div>
            <input value={fromName} onChange={e => setFromName(e.target.value)} style={inStyle} placeholder="PesaPips Team" />
          </div>

          {/* Notification type (only for notify tab) */}
          {tab === "notify" && (
            <div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>TYPE</div>
              <select value={type} onChange={e => setType(e.target.value)} style={inStyle}>
                <option value="info">ℹ Info</option>
                <option value="system">⚙ System</option>
                <option value="trade">📈 Trade</option>
                <option value="mt5">🔌 MT5</option>
                <option value="signal">📡 Signal</option>
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>
              {tab === "notify" ? "TITLE" : "SUBJECT"}
            </div>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inStyle}
              placeholder={tab === "notify" ? "Notification title..." : "Message subject..."} />
          </div>

          {/* Body */}
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 6 }}>
              {tab === "notify" ? "MESSAGE" : "BODY"}
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              style={{ ...inStyle, minHeight: 160, resize: "vertical", lineHeight: 1.6 }}
              placeholder={tab === "notify" ? "Notification message..." : "Write your message..."} />
          </div>

          {/* Status */}
          {status === "sent" && (
            <div style={{ padding: "10px 14px", background: "rgba(61,214,140,0.1)", border: `1px solid ${C.green}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.green }}>
              {target === "all" ? "Broadcast sent to all users." : "Message sent successfully."}
            </div>
          )}
          {status === "error" && (
            <div style={{ padding: "10px 14px", background: "rgba(240,107,107,0.1)", border: `1px solid ${C.red}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red }}>
              Please fill in all fields.
            </div>
          )}

          <button onClick={tab === "notify" ? sendNotification : sendMessage}
            disabled={sending}
            style={{ padding: "12px 24px", background: C.gold, border: "none", borderRadius: 8,
              fontFamily: C.sans, fontSize: 14, fontWeight: 700, color: "#0d0f14",
              cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending..." : tab === "notify" ? "Send Notification" : target === "all" ? "Broadcast to All Users" : "Send Message"}
          </button>
        </div>
      )}

      {/* Sent history */}
      {tab === "sent" && (
        <div>
          {sent.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontFamily: C.sans, fontSize: 14, color: C.text3 }}>No messages sent yet</div>
          ) : sent.map(m => (
            <div key={m.id} style={{ padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text }}>{m.subject}</div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: m.broadcast ? C.gold : C.blue }}>
                  {m.broadcast ? "BROADCAST" : "DIRECT"}
                </div>
              </div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text3, marginBottom: 6 }}>From: {m.from_name}</div>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 8 }}>{m.body}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{new Date(m.created_at).toLocaleString("en-KE")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// PAYMENTS
function Payments() {
  const [payments,  setPayments]  = useState([])
  const [filter,    setFilter]    = useState("pending")
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState(null)
  const [toast,     setToast]     = useState("")

  const load = () => {
    setLoading(true)
    api.get("/admin/payments?status=" + filter)
      .then(r => setPayments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const approve = async (id, email, plan) => {
    setActing(id)
    try {
      await api.post("/admin/payments/" + id + "/approve")
      showToast(email + " upgraded to " + plan.toUpperCase())
      load()
    } catch(e) { showToast("Error approving payment") }
    setActing(null)
  }

  const reject = async (id) => {
    setActing(id)
    try {
      await api.post("/admin/payments/" + id + "/reject")
      showToast("Payment rejected")
      load()
    } catch(e) { showToast("Error") }
    setActing(null)
  }

  const METHOD_ICON = { mpesa: "📱", crypto: "₿" }
  const PLAN_COLOR  = { pro: "#5b9cf6", elite: "#d4a843", platinum: "#e2c4f0" }

  return (
    <div style={{ maxWidth: 900 }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: C.surface, border: `1px solid ${C.green}40`,
          borderRadius: 10, padding: "12px 20px", fontFamily: C.sans, fontSize: 13, color: C.green, zIndex: 999 }}>
          {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {[["pending", "⏳ Pending"], ["approved", "✓ Approved"], ["rejected", "✗ Rejected"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: filter === id ? `2px solid ${C.gold}` : "2px solid transparent",
            fontFamily: C.sans, fontSize: 13, fontWeight: filter === id ? 600 : 400,
            color: filter === id ? C.gold : C.text3, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontFamily: C.mono, fontSize: 12, color: C.text3 }}>Loading...</div>
      ) : payments.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontFamily: C.sans, fontSize: 14, color: C.text3 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          No {filter} payments
        </div>
      ) : payments.map(p => (
        <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "20px 24px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 700, color: C.text }}>{p.email}</span>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: PLAN_COLOR[p.plan] || C.gold,
                  background: `${PLAN_COLOR[p.plan]}15`, padding: "2px 8px", borderRadius: 4 }}>
                  {p.plan.toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
                {new Date(p.created_at).toLocaleString("en-KE")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: C.display, fontSize: 20, color: C.green }}>KSh {p.amount.toLocaleString()}</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
                {METHOD_ICON[p.method] || "💰"} {p.method.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: C.surface2, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 4 }}>
                {p.method === "mpesa" ? "M-PESA CODE" : "TX HASH"}
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.gold, wordBreak: "break-all" }}>{p.tx_ref}</div>
            </div>
            {p.phone && (
              <div style={{ background: C.surface2, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginBottom: 4 }}>PHONE</div>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>{p.phone}</div>
              </div>
            )}
          </div>

          {filter === "pending" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => approve(p.id, p.email, p.plan)}
                disabled={acting === p.id}
                style={{ flex: 1, padding: "10px", background: C.green, border: "none", borderRadius: 8,
                  fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: "#000",
                  cursor: acting === p.id ? "not-allowed" : "pointer", opacity: acting === p.id ? 0.6 : 1 }}>
                {acting === p.id ? "Processing..." : "✓ Approve & Upgrade"}
              </button>
              <button onClick={() => reject(p.id)}
                disabled={acting === p.id}
                style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${C.red}40`,
                  borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.red,
                  cursor: acting === p.id ? "not-allowed" : "pointer" }}>
                ✗ Reject
              </button>
            </div>
          )}

          {filter !== "pending" && (
            <div style={{ fontFamily: C.mono, fontSize: 10, color: filter === "approved" ? C.green : C.red, letterSpacing: "0.1em" }}>
              {filter === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── BLOG MANAGEMENT ──────────────────────────────────────────────────────────
function BlogManagement() {
  const [tab,     setTab]     = useState("pending")
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)
  const [note,    setNote]    = useState("")
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState("")

  const load = (status) => {
    setLoading(true)
    const url = status === "pending" ? "/blog/admin/pending" : `/blog/admin/all?status=${status}`
    api.get(url).then(r => setPosts(Array.isArray(r.data) ? r.data : [])).catch(()=>setPosts([])).finally(()=>setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const approve = async (id, featured=false) => {
    setSaving(true); setMsg("")
    try {
      await api.post(`/blog/admin/${id}/approve`, { featured })
      setMsg("✅ Post approved and published")
      setSelected(null)
      load(tab)
    } catch(e) { setMsg("Error: " + (e.response?.data?.detail || "failed")) }
    setSaving(false)
  }

  const reject = async (id) => {
    if (!note.trim()) { setMsg("Please add a rejection reason"); return }
    setSaving(true); setMsg("")
    try {
      await api.post(`/blog/admin/${id}/reject`, { reason: note })
      setMsg("❌ Post rejected — author notified")
      setSelected(null); setNote("")
      load(tab)
    } catch(e) { setMsg("Error: " + (e.response?.data?.detail || "failed")) }
    setSaving(false)
  }

  const STATUS_COLORS = { published:"#3dd68c", pending:"#f5c842", rejected:"#f06b6b", draft:"#9aa0b0" }

  return (
    <div>
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginBottom: 20 }}>BLOG MANAGEMENT</div>

      {msg && <div style={{ padding:"10px 14px", background:msg.startsWith("✅")?"rgba(61,214,140,0.08)":"rgba(240,107,107,0.08)", border:`1px solid ${msg.startsWith("✅")?"rgba(61,214,140,0.3)":"rgba(240,107,107,0.3)"}`, borderRadius:8, fontFamily:C.mono, fontSize:11, color:msg.startsWith("✅")?C.green:C.red, marginBottom:16 }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {[["pending","⏳ Pending"],["published","✅ Published"],["rejected","❌ Rejected"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setTab(id);setSelected(null)}} style={{ padding:"8px 16px", borderRadius:6, border:`1px solid ${tab===id?C.gold:C.border}`, background:tab===id?C.goldDim:"transparent", color:tab===id?C.gold:C.text3, fontFamily:C.mono, fontSize:10, cursor:"pointer" }}>{label}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 1fr":"1fr", gap:20 }}>
        {/* Post list */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {loading ? <div style={{ fontFamily:C.mono, fontSize:11, color:C.text3, padding:20 }}>Loading...</div>
          : posts.length === 0 ? <div style={{ fontFamily:C.mono, fontSize:11, color:C.text3, padding:20 }}>No {tab} posts</div>
          : posts.map(post => (
            <div key={post.id} onClick={()=>setSelected(post)} style={{ padding:"14px 16px", background:selected?.id===post.id?C.surface2:C.surface, border:`1px solid ${selected?.id===post.id?C.gold:C.border}`, borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>{post.title}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.text3 }}>By {post.author_name}</span>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.text3 }}>{post.category}</span>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.text3 }}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span style={{ fontFamily:C.mono, fontSize:9, color:STATUS_COLORS[post.status], padding:"2px 8px", background:`${STATUS_COLORS[post.status]}15`, borderRadius:4, flexShrink:0 }}>{post.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Post detail */}
        {selected && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px", maxHeight:600, overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.1em" }}>REVIEW POST</div>
              <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:16 }}>×</button>
            </div>

            <div style={{ fontFamily:C.sans, fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>{selected.title}</div>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.text3, marginBottom:16 }}>By {selected.author_name} · {selected.category} · {selected.author_plan?.toUpperCase()}</div>

            {selected.excerpt && <div style={{ padding:"10px 14px", background:C.surface2, borderRadius:8, fontFamily:C.sans, fontSize:13, color:C.text2, fontStyle:"italic", marginBottom:16 }}>{selected.excerpt}</div>}

            <div style={{ fontFamily:C.sans, fontSize:13, color:C.text2, lineHeight:1.7, marginBottom:20, maxHeight:200, overflowY:"auto", padding:"10px", background:C.surface2, borderRadius:8 }}>
              {selected.content?.slice(0,500)}...
            </div>

            {selected.status === "pending" && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>approve(selected.id,false)} disabled={saving} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:C.green, color:"#000", fontFamily:C.mono, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    ✅ Approve
                  </button>
                  <button onClick={()=>approve(selected.id,true)} disabled={saving} style={{ flex:1, padding:"10px", borderRadius:8, border:`1px solid ${C.gold}`, background:C.goldDim, color:C.gold, fontFamily:C.mono, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    ★ Approve + Feature
                  </button>
                </div>
                <div>
                  <label style={{ fontFamily:C.mono, fontSize:9, color:C.text3, display:"block", marginBottom:6 }}>REJECTION REASON</label>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Explain why the post was not approved..." style={{ width:"100%", padding:"10px", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.sans, fontSize:13, outline:"none", resize:"vertical" }} />
                  <button onClick={()=>reject(selected.id)} disabled={saving||!note.trim()} style={{ width:"100%", marginTop:8, padding:"10px", borderRadius:8, border:`1px solid ${C.red}40`, background:"transparent", color:C.red, fontFamily:C.mono, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                    ❌ Reject with Note
                  </button>
                </div>
              </div>
            )}

            {selected.status === "published" && (
              <a href={`/blog/${selected.slug}`} target="_blank" rel="noopener noreferrer" style={{ display:"block", padding:"10px", textAlign:"center", borderRadius:8, border:`1px solid ${C.gold}40`, color:C.gold, fontFamily:C.mono, fontSize:10, fontWeight:700 }}>
                View live post →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


export default function AdminDashboard() {
  const [section,  setSection]  = useState("overview")
  const [user,     setUser]     = useState(null)
  const [checking, setChecking] = useState(true)
  const [badges,   setBadges]   = useState({ tickets: 0, feedback: 0, reviews: 0, blog: 0 })

  useEffect(() => {
    const token = localStorage.getItem("pp_token")
    if (!token) {
      setChecking(false)
      window.location.href = "/login"
      return
    }
    api.get("/auth/me").then(r => {
      if (!r.data.is_admin) {
        setChecking(false)
        window.location.href = "/dashboard"
      } else {
        setUser(r.data)
        setChecking(false)
      }
    }).catch(() => {
      setChecking(false)
      window.location.href = "/login"
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const loadBadges = () => {
      Promise.all([
        api.get("/admin/tickets?status=open&limit=1"),
        api.get("/admin/feedback?is_read=false&limit=1"),
        api.get("/admin/reviews?approved=false&limit=1"),
        api.get("/blog/admin/pending"),
      ]).then(([tr, fr, rr, br]) => {
        setBadges({
          tickets:  tr.data?.total  || 0,
          feedback: fr.data?.total  || 0,
          reviews:  rr.data?.length || 0,
          blog:     br.data?.length || 0,
        })
      }).catch(() => {})
    }
    loadBadges()
    const id = setInterval(loadBadges, 30000)
  }, [user])

  if (checking) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>Verifying access...</div>
      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, opacity: 0.5 }}>
        Not redirecting? <a href="/login" style={{ color: C.gold }}>Log in first</a>
      </div>
    </div>
  )

  if (!user) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: C.mono, fontSize: 14, color: C.red }}>Access denied</div>
      <a href="/login" style={{ fontFamily: C.mono, fontSize: 12, color: C.gold }}>← Go to login</a>
    </div>
  )

  const NAV = [
    { id: "overview",      label: "Overview",      icon: "◈", badge: 0 },
    { id: "users",         label: "Users",          icon: "◉", badge: 0 },
    { id: "tickets",       label: "Tickets",        icon: "🎫", badge: badges.tickets  },
    { id: "feedback",      label: "Feedback",       icon: "📬", badge: badges.feedback },
    { id: "reviews",       label: "Reviews",        icon: "⭐", badge: badges.reviews  },
    { id: "blog",          label: "Blog",           icon: "✍️", badge: badges.blog || 0 },
    { id: "courses",       label: "Courses",        icon: "📚", badge: 0 },
    { id: "strategies",    label: "Strategies",     icon: "⚡", badge: 0 },
    { id: "announcements", label: "Announcements",  icon: "📢", badge: 0 },
    { id: "messaging",     label: "Messaging",       icon: "✉️", badge: 0 },
    { id: "payments",      label: "Payments",        icon: "💳", badge: 0 },
  ]

  const SECTION_TITLE = {
    overview:      "Command Centre",
    users:         "User Management",
    tickets:       "Support Tickets",
    feedback:      "Feedback Inbox",
    reviews:       "Reviews",
    courses:       "Course Management",
    strategies:    "Strategy Library",
    announcements: "Announcements",
    messaging:     "Messaging",
    payments:      "Payment Confirmations",
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", fontFamily: C.sans }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: C.display, fontSize: 16, color: C.gold, letterSpacing: 2 }}>PESAPIPS</div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.14em", marginTop: 3 }}>ADMIN CONSOLE</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: "none",
              background: section === n.id ? C.goldDim : "transparent",
              color: section === n.id ? C.gold : C.text3,
              fontFamily: C.sans, fontSize: 13, fontWeight: section === n.id ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s", textAlign: "left", marginBottom: 2,
            }}
              onMouseEnter={e => { if (section !== n.id) e.currentTarget.style.background = C.surface2 }}
              onMouseLeave={e => { if (section !== n.id) e.currentTarget.style.background = "transparent" }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>
              {n.label}
              {n.badge > 0 && (
                <span style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9, background: "#f04f5a", color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                  {n.badge > 99 ? "99+" : n.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom — back to dashboard + user */}
        <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}` }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, textDecoration: "none", color: C.text3, fontFamily: C.sans, fontSize: 12, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.text3}>
            ← Back to dashboard
          </a>
          {user && (
            <div style={{ padding: "8px 12px", marginTop: 4 }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{user.display_name || user.email?.split("@")[0]}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.gold }}>ADMIN</div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "20px 32px", borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontFamily: C.display, fontSize: 20, color: C.text }}>{SECTION_TITLE[section]}</div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 32px" }}>
          {section === "overview"      && <Overview />}
          {section === "users"         && <UserManagement />}
          {section === "tickets"       && <Tickets />}
          {section === "feedback"      && <FeedbackInbox />}
          {section === "reviews"       && <Reviews />}
          {section === "courses"       && <CourseManagement />}
          {section === "strategies"    && <StrategyLibrary />}
          {section === "announcements" && <Announcements />}
          {section === "messaging"     && <Messaging />}
          {section === "payments"      && <Payments />}
          {section === "blog"           && <BlogManagement />}
        </div>
      </div>
    </div>
  )
}
