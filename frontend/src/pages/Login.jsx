import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"

const API = "http://localhost:8000"

const C = {
  bg:       "#171a20",
  surface:  "#1f2330",
  surface2: "#262c3a",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  gold:     "#d4a843",
  goldDim:  "rgba(212,168,67,0.10)",
  green:    "#3dd68c",
  red:      "#f06b6b",
  text:     "#edeef0",
  text2:    "#9aa0b0",
  text3:    "#5a6070",
  mono:     "'DM Mono', 'Courier New', monospace",
  display:  "'DM Serif Display', Georgia, serif",
  sans:     "'DM Sans', system-ui, sans-serif",
}

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  background: C.surface2,
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  color: C.text,
  fontFamily: C.sans,
  fontSize: 15,
  outline: "none",
  transition: "border-color 0.2s",
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) { setError("Please fill in all fields"); return }
    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/login`, form)
      localStorage.setItem("pp_token", res.data.access_token)
      // Check if user needs onboarding
      const me = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${res.data.access_token}` } })
      if (!me.data.onboarded) {
        navigate("/onboarding")
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        input::placeholder { color: ${C.text3}; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px ${C.surface2} inset !important;
          -webkit-text-fill-color: ${C.text} !important;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ minHeight: "100vh", position: "relative", background: C.bg, display: "flex", fontFamily: C.sans }}>
        {/* Back to home */}
        <a href="/" style={{ position: "fixed", top: 24, left: 28, display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 11, color: C.text3, textDecoration: "none", letterSpacing: "0.08em", zIndex: 100, transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = C.gold}
          onMouseLeave={e => e.currentTarget.style.color = C.text3}>
          ← HOME
        </a>

        {/* ── LEFT: FORM ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          padding: "60px 5%", position: "relative", overflow: "hidden",
        }}>
          {/* subtle grid */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `linear-gradient(rgba(212,168,67,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.025) 1px, transparent 1px)`,
            backgroundSize: "52px 52px",
          }}/>
          {/* glow */}
          <div style={{
            position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)",
            width: 500, height: 400,
            background: "radial-gradient(ellipse, rgba(212,168,67,0.05) 0%, transparent 65%)",
            zIndex: 0,
          }}/>

          <div style={{ position: "relative", zIndex: 1, maxWidth: 440, width: "100%", animation: "fadeUp 0.5s ease both" }}>

            {/* Logo */}
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 52, textDecoration: "none" }}>
              <div style={{ width: 34, height: 34, background: C.gold, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, color: "#000", fontFamily: C.sans }}>P</div>
              <span style={{ fontFamily: C.display, fontSize: 20, color: C.text, letterSpacing: "-0.01em" }}>PesaPips</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.gold, letterSpacing: "0.18em", opacity: 0.8 }}>AI</span>
            </Link>

            {/* Heading */}
            <h1 style={{ fontFamily: C.display, fontSize: 36, color: C.text, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15 }}>
              Welcome back
            </h1>
            <p style={{ fontFamily: C.sans, fontSize: 15, color: C.text2, marginBottom: 40, lineHeight: 1.6 }}>
              Sign in to your PesaPips account to continue.
            </p>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(240,107,107,0.08)",
                border: "1px solid rgba(240,107,107,0.2)",
                borderRadius: 8, padding: "11px 14px",
                marginBottom: 24, fontSize: 13,
                fontFamily: C.sans, color: C.red,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 15 }}>⚠</span> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

              <div>
                <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>EMAIL ADDRESS</label>
                <input
                  name="email" type="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.gold}
                  onBlur={e => e.target.style.borderColor = C.border2}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.12em" }}>PASSWORD</label>
                  <a href="#" style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, textDecoration: "none", opacity: 0.8 }}
                    onMouseEnter={e => e.target.style.opacity = "1"}
                    onMouseLeave={e => e.target.style.opacity = "0.8"}
                  >Forgot password?</a>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    name="password" type={showPass ? "text" : "password"}
                    value={form.password} onChange={handleChange}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => e.target.style.borderColor = C.gold}
                    onBlur={e => e.target.style.borderColor = C.border2}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: C.text3, fontSize: 13, padding: 4, lineHeight: 1,
                    transition: "color 0.2s",
                  }}
                    onMouseEnter={e => e.target.style.color = C.text}
                    onMouseLeave={e => e.target.style.color = C.text3}
                  >{showPass ? "hide" : "show"}</button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px",
                background: loading ? `rgba(212,168,67,0.5)` : C.gold,
                color: "#0d0f14", border: "none", borderRadius: 8,
                fontFamily: C.sans, fontWeight: 700, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s", marginTop: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#e8bb55" }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.gold }}
              >
                {loading ? (
                  <>
                    <span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }}/>
                    Signing in...
                  </>
                ) : "Sign in to PesaPips"}
              </button>

            </form>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "28px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }}/>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>NEW HERE?</span>
              <div style={{ flex: 1, height: 1, background: C.border }}/>
            </div>

            <Link to="/register" style={{
              display: "block", textAlign: "center", padding: "13px",
              background: "transparent", border: `1px solid ${C.border2}`,
              borderRadius: 8, fontFamily: C.sans, fontWeight: 600, fontSize: 14,
              color: C.text2, textDecoration: "none", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text2 }}
            >Create a free account →</Link>

          </div>
        </div>

        {/* ── RIGHT: INFO PANEL ── */}
        <div style={{
          width: "42%", background: C.surface,
          borderLeft: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "60px 52px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 320, height: 320, background: "radial-gradient(ellipse, rgba(212,168,67,0.06) 0%, transparent 65%)" }}/>

          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 36, opacity: 0.8 }}>WHAT YOU GET</div>

          {[
            { icon: "◈", title: "AI signal engine", desc: "EMA 9/21/50 + RSI + MACD running on every candle, 24 hours a day." },
            { icon: "⚡", title: "Live auto-trading", desc: "The bot executes trades on your MT5 account automatically." },
            { icon: "◎", title: "Full transparency", desc: "Every parameter visible. Adjust anything. Pause any time." },
            { icon: "△", title: "Backtest first", desc: "Test any strategy on historical data before going live with real money." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 28 }}>
              <div style={{
                width: 38, height: 38, flexShrink: 0,
                background: C.goldDim, border: `1px solid rgba(212,168,67,0.18)`,
                borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: C.gold,
              }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          {/* Testimonial */}
          <div style={{
            marginTop: 12, padding: "20px 22px",
            background: `rgba(212,168,67,0.04)`,
            border: `1px solid rgba(212,168,67,0.12)`,
            borderRadius: 12,
          }}>
            <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, lineHeight: 1.75, fontStyle: "italic", marginBottom: 14 }}>
              "Finally a bot that shows me exactly what it's doing and why. No more blind trust in a black box."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, #a07020)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#000", fontFamily: C.sans }}>J</div>
              <div>
                <div style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.text }}>James K.</div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em" }}>NAIROBI · PRO USER</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
