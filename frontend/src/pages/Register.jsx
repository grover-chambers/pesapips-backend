import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"

const API = "http://localhost:8000"

const C = {
  bg: "#171a20", surface: "#1f2330", surface2: "#262c3a",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.12)",
  gold: "#d4a843", goldDim: "rgba(212,168,67,0.10)",
  green: "#3dd68c", red: "#f06b6b", blue: "#5b9cf6",
  text: "#edeef0", text2: "#9aa0b0", text3: "#5a6070",
  mono: "'DM Mono', 'Courier New', monospace",
  display: "'DM Serif Display', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
}

const inputStyle = {
  width: "100%", padding: "13px 16px", background: "#262c3a",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
  color: "#edeef0", fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 15, outline: "none", transition: "border-color 0.2s",
}

const PLANS = [
  {
    id: "free", label: "Starter", price: "Free", color: C.text2,
    desc: "Perfect for learning and manual trading",
    features: ["1 MT5 account", "EMA+RSI+MACD strategy", "5 signal runs/day", "Backtest (100 candles)", "Community support"],
  },
  {
    id: "pro", label: "Pro", price: "KSh 2,500/mo", color: C.blue,
    desc: "Full automation for active traders",
    features: ["3 MT5 accounts", "3 library strategies", "Unlimited signal runs", "Backtest (500 candles)", "Autorun engine", "Email support"],
  },
  {
    id: "elite", label: "Elite", price: "KSh 5,000/mo", color: C.gold,
    desc: "Advanced strategies + full analytics",
    features: ["5 MT5 accounts", "All library strategies", "SMC Order Block + FVG", "Backtest (1000 candles)", "Full performance analytics", "Priority support"],
  },
  {
    id: "platinum", label: "Platinum", price: "KSh 9,000/mo", color: "#e2c4f0",
    desc: "Unlimited everything for professionals",
    features: ["Unlimited MT5 accounts", "All strategies incl. Swing Momentum", "Unlimited custom strategies", "Backtest (2000 candles)", "Dedicated account manager", "API access"],
  },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState({ email: "", password: "", confirm: "", plan: "free" })
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleStep1 = e => {
    e.preventDefault()
    if (!form.email) { setError("Please enter your email"); return }
    if (!form.password || form.password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (form.password !== form.confirm) { setError("Passwords do not match"); return }
    setError(""); setStep(2)
  }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await axios.post(`${API}/auth/register`, { email: form.email, password: form.password })
      const res = await axios.post(`${API}/auth/login`, { email: form.email, password: form.password })
      localStorage.setItem("pp_token", res.data.access_token)
      navigate("/onboarding")
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.")
      setStep(1)
    } finally { setLoading(false) }
  }

  const strengthScore = p => {
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = strengthScore(form.password)
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength]
  const strengthColor = ["", C.red, "#f0a843", C.gold, C.green][strength]

  const selectedPlan = PLANS.find(p => p.id === form.plan)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #171a20; }
        input::placeholder { color: #5a6070; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #262c3a inset !important; -webkit-text-fill-color: #edeef0 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", fontFamily: C.sans }}>
        <a href="/" style={{ position: "fixed", top: 24, left: 28, display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 11, color: C.text3, textDecoration: "none", letterSpacing: "0.08em", zIndex: 100, transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = C.gold}
          onMouseLeave={e => e.currentTarget.style.color = C.text3}>← HOME</a>

        {/* LEFT: Form */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 5%", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(212,168,67,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.025) 1px, transparent 1px)`, backgroundSize: "52px 52px" }}/>
          <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(212,168,67,0.05) 0%, transparent 65%)", zIndex: 0 }}/>

          <div style={{ position: "relative", zIndex: 1, maxWidth: step === 2 ? 560 : 440, width: "100%", animation: "fadeUp 0.5s ease both" }}>

            {/* Logo */}
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 44, textDecoration: "none" }}>
              <div style={{ width: 34, height: 34, background: C.gold, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, color: "#000" }}>P</div>
              <span style={{ fontFamily: C.display, fontSize: 20, color: C.text, letterSpacing: "-0.01em" }}>PesaPips</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.18em", opacity: 0.8 }}>AI</span>
            </Link>

            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36 }}>
              {[1, 2].map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: step >= n ? C.gold : C.surface2, border: `1px solid ${step >= n ? C.gold : C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: step >= n ? "#000" : C.text3, transition: "all 0.3s" }}>
                    {step > n ? "✓" : n}
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: step >= n ? C.gold : C.text3, letterSpacing: "0.08em" }}>{n === 1 ? "ACCOUNT" : "PLAN"}</span>
                  {n < 2 && <div style={{ width: 32, height: 1, background: step > n ? C.gold : C.border2, transition: "background 0.3s" }}/>}
                </div>
              ))}
            </div>

            <h1 style={{ fontFamily: C.display, fontSize: 34, color: C.text, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15 }}>
              {step === 1 ? "Create your account" : "Choose your plan"}
            </h1>
            <p style={{ fontFamily: C.sans, fontSize: 15, color: C.text2, marginBottom: 36, lineHeight: 1.6 }}>
              {step === 1 ? "Start free — no credit card needed." : "Start free and upgrade anytime. All plans include a 7-day trial of Pro features."}
            </p>

            {error && (
              <div style={{ background: "rgba(240,107,107,0.08)", border: "1px solid rgba(240,107,107,0.2)", borderRadius: 8, padding: "11px 14px", marginBottom: 24, fontSize: 13, fontFamily: C.sans, color: C.red, display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handleStep1} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "slideIn 0.3s ease both" }}>
                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>EMAIL ADDRESS</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
                </div>

                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Minimum 8 characters" style={{ ...inputStyle, paddingRight: 52 }}
                      onFocus={e => e.target.style.borderColor = C.gold}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3, fontFamily: C.mono, fontSize: 10, padding: 4 }}>
                      {showPass ? "hide" : "show"}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= strength ? strengthColor : C.surface2, transition: "background 0.3s" }}/>)}
                      </div>
                      <span style={{ fontFamily: C.mono, fontSize: 10, color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>CONFIRM PASSWORD</label>
                  <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="••••••••"
                    style={{ ...inputStyle, borderColor: form.confirm && form.confirm !== form.password ? "rgba(240,107,107,0.4)" : "rgba(255,255,255,0.12)" }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = form.confirm && form.confirm !== form.password ? "rgba(240,107,107,0.4)" : "rgba(255,255,255,0.12)"} />
                  {form.confirm && form.confirm !== form.password && (
                    <p style={{ fontFamily: C.mono, fontSize: 10, color: C.red, marginTop: 6 }}>Passwords don't match</p>
                  )}
                </div>

                <button type="submit" style={{ width: "100%", padding: "14px", background: C.gold, color: "#0d0f14", border: "none", borderRadius: 8, fontFamily: C.sans, fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s", marginTop: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e8bb55"}
                  onMouseLeave={e => e.currentTarget.style.background = C.gold}>
                  Continue →
                </button>
              </form>
            )}

            {/* STEP 2 — Plan selection with feature comparison */}
            {step === 2 && (
              <form onSubmit={handleSubmit} style={{ animation: "slideIn 0.3s ease both" }}>

                {/* Plan cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {PLANS.map(plan => (
                    <label key={plan.id} style={{ display: "flex", flexDirection: "column", gap: 0, cursor: "pointer", borderRadius: 12, background: form.plan === plan.id ? `${plan.color}10` : C.surface2, border: `1px solid ${form.plan === plan.id ? plan.color + "50" : C.border}`, transition: "all 0.2s", overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="radio" name="plan" value={plan.id} checked={form.plan === plan.id} onChange={handleChange} style={{ accentColor: plan.color, width: 14, height: 14 }} />
                            <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 700, color: form.plan === plan.id ? plan.color : C.text }}>{plan.label}</span>
                          </div>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: plan.color, fontWeight: 600 }}>{plan.price}</span>
                        </div>
                        <p style={{ fontFamily: C.sans, fontSize: 11, color: C.text3, marginLeft: 22, lineHeight: 1.4 }}>{plan.desc}</p>
                      </div>

                      {/* Features — expandable */}
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px", background: form.plan === plan.id ? `${plan.color}08` : "transparent" }}>
                        <button type="button" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 9, color: plan.color, letterSpacing: "0.08em", padding: 0 }}>
                          {expanded === plan.id ? "▲ Hide features" : "▼ See features"}
                        </button>
                        {expanded === plan.id && (
                          <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: "none" }}>
                            {plan.features.map((f, i) => (
                              <li key={i} style={{ fontFamily: C.sans, fontSize: 11, color: C.text2, marginBottom: 5, display: "flex", gap: 6, alignItems: "flex-start" }}>
                                <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Selected plan summary */}
                {selectedPlan && (
                  <div style={{ padding: "12px 16px", background: `${selectedPlan.color}08`, border: `1px solid ${selectedPlan.color}25`, borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>SELECTED</span>
                    <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: selectedPlan.color }}>{selectedPlan.label} — {selectedPlan.price}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>Change anytime</span>
                  </div>
                )}

                {/* Broker recommendation */}
                <div style={{ padding: "14px 16px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 20 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.1em", marginBottom: 8 }}>NO BROKER YET?</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <p style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.5, flex: 1 }}>
                      We recommend <strong style={{ color: C.text }}>HFM (HF Markets)</strong> — low spreads on XAUUSD, fast execution, MT5 supported. Free to open.
                    </p>
                    <a href="https://register.hfm.com/ke/en/new-live-account/?refid=30359412" target="_blank" rel="noopener noreferrer"
                      style={{ padding: "8px 14px", borderRadius: 7, background: C.gold, color: "#000", fontFamily: C.mono, fontSize: 10, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Open HFM →
                    </a>
                  </div>
                  <p style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 8 }}>Affiliate link · We may earn a commission at no cost to you</p>
                </div>

                <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "rgba(212,168,67,0.5)" : C.gold, color: "#0d0f14", border: "none", borderRadius: 8, fontFamily: C.sans, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#e8bb55" }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold }}>
                  {loading ? (<><span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }}/>Creating account...</>) : `Create my ${selectedPlan?.label || ""} account →`}
                </button>

                <button type="button" onClick={() => setStep(1)} style={{ width: "100%", padding: "12px", marginTop: 10, background: "transparent", border: "none", fontFamily: C.sans, fontSize: 14, color: C.text3, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = C.text}
                  onMouseLeave={e => e.target.style.color = C.text3}>← Back</button>
              </form>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "28px 0 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }}/>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>HAVE AN ACCOUNT?</span>
              <div style={{ flex: 1, height: 1, background: C.border }}/>
            </div>
            <Link to="/login" style={{ display: "block", textAlign: "center", padding: "13px", marginTop: 14, background: "transparent", border: `1px solid ${C.border2}`, borderRadius: 8, fontFamily: C.sans, fontWeight: 600, fontSize: 14, color: C.text2, textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}>
              Sign in instead
            </Link>
          </div>
        </div>

        {/* RIGHT: Benefits panel */}
        <div style={{ width: "38%", background: C.surface, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: "radial-gradient(ellipse, rgba(212,168,67,0.06) 0%, transparent 65%)" }}/>

          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 32, opacity: 0.8 }}>WHY PESAPIPS</div>

          {[
            { icon: "◈", title: "No black boxes", desc: "Every trade decision is explained. You see the exact indicators that triggered each signal." },
            { icon: "⚡", title: "Connect any MT5 broker", desc: "Works with HFM, ICMarkets, Exness, Pepperstone and any MT5-compatible broker." },
            { icon: "◎", title: "Risk manager included", desc: "Automatic lot sizing, max drawdown limits and news event filters protect your capital." },
            { icon: "◇", title: "Built for Kenya", desc: "Priced in KES, support on WhatsApp and Telegram, built by Nairobi traders." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, background: C.goldDim, border: `1px solid rgba(212,168,67,0.18)`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.gold }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontFamily: C.sans, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {[["Free", "to start"], ["Any broker", "MT5 compatible"], ["100%", "transparent"], ["KES", "local pricing"]].map(([val, label]) => (
              <div key={label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.gold, marginBottom: 3 }}>{val}</div>
                <div style={{ fontFamily: C.sans, fontSize: 11, color: C.text3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Risk note */}
          <p style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 28, lineHeight: 1.6 }}>
            PesaPips is a trading tool, not a financial advisor. Trading involves risk — only trade what you can afford to lose.
          </p>
        </div>
      </div>
    </>
  )
}
