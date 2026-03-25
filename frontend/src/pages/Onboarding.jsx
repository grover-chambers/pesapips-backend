import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const BASE = "http://localhost:8000"

function getToken() {
  return localStorage.getItem("pp_token") || ""
}

async function completeOnboarding() {
  try {
    await axios.post(`${BASE}/auth/onboarding/complete`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    return true
  } catch {
    return false
  }
}

async function getMe() {
  const res = await axios.get(`${BASE}/auth/me?_=${Date.now()}`, {
    headers: { Authorization: `Bearer ${getToken()}`, "Cache-Control": "no-cache" }
  })
  return res.data
}

const STEPS = [
  {
    icon: "◈", color: "#f5c842",
    title: "Welcome to PesaPips",
    sub: "YOUR AI TRADING CO-PILOT",
    body: "PesaPips connects your MT5 broker to an AI signal engine that generates trade signals, runs backtests, and can automatically execute trades — all in one dashboard.",
    btn: "Get Started →",
  },
  {
    icon: "⬇", color: "#5b9cf6",
    title: "Download the EA",
    sub: "STEP 1 OF 4 — INSTALL THE BRIDGE",
    body: "Download the PesaPips EA (.mq5 file) from MT5 Connect in the sidebar. Copy it to your MetaTrader 5 Experts folder and restart MT5.",
    steps: ["Go to MT5 Connect in the sidebar", "Click Download EA", "Copy file to MT5 Experts folder", "Restart MetaTrader 5"],
    btn: "Next →",
  },
  {
    icon: "⚡", color: "#3dd68c",
    title: "Connect MT5",
    sub: "STEP 2 OF 4 — LINK YOUR BROKER",
    body: "In MetaTrader 5, drag the PesaPipsEA onto any chart. Enable 'Allow DLL imports'. The green dot in MT5 Connect confirms the bridge is live.",
    steps: ["Open MetaTrader 5", "Drag PesaPipsEA onto any chart", "Enable Allow DLL imports", "Check green dot in MT5 Connect"],
    btn: "Next →",
  },
  {
    icon: "◎", color: "#a78bfa",
    title: "Pick a Strategy",
    sub: "STEP 3 OF 4 — CHOOSE YOUR STYLE",
    body: "Start with the free EMA+RSI+MACD strategy — the most battle-tested. Activate it from the Overview tab. Upgrade anytime to unlock advanced strategies.",
    btn: "Next →",
  },
  {
    icon: "▶", color: "#f06b6b",
    title: "Run a Backtest",
    sub: "STEP 4 OF 4 — VERIFY BEFORE GOING LIVE",
    body: "Go to the Backtest tab, select your strategy and asset, and click Run. Review winrate and profit factor before activating live trading.",
    steps: ["Go to the Backtest tab", "Select your strategy and asset", "Click Run Backtest", "Review results before going live"],
    btn: "Next →",
  },
  {
    icon: "✦", color: "#3dd68c",
    title: "You're Ready to Trade",
    sub: "PROFESSIONAL AI TRADING — ACTIVATED",
    body: "Your setup is complete. Head to the Overview to see live signals on your chart, activate a strategy, and turn on Autorun to let the AI trade automatically.",
    btn: "Enter Dashboard",
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [isNew, setIsNew]     = useState(true)

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return }
    getMe()
      .then(u => {
        if (u.onboarded) {
          // Already onboarded — go straight to dashboard
          window.location.href = "/dashboard"
          return
        }
        setIsNew(!u.onboarded)
        setLoading(false)
      })
      .catch(() => { window.location.href = "/login" })
  }, [])

  const finish = async () => {
    setSaving(true)
    await completeOnboarding()
    // Verify it saved before redirecting
    try {
      const me = await axios.get(`${BASE}/auth/me?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (me.data.onboarded) {
        window.location.href = "/dashboard"
      } else {
        // Force it and redirect anyway
        await completeOnboarding()
        window.location.href = "/dashboard"
      }
    } catch {
      window.location.href = "/dashboard"
    }
  }

  const skip = async () => {
    await completeOnboarding()
    window.location.href = "/dashboard"
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#07080d", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontFamily:"monospace", color:"#4a4f6a", fontSize:12 }}>Loading...</span>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:"#07080d", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>

      <div style={{ width:"100%", maxWidth:520, background:"#0d0f14", border:"1px solid #1e2130", borderRadius:20, overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,0.7)" }}>

        {/* Progress */}
        <div style={{ height:3, background:"#1a1d2e" }}>
          <div style={{ height:"100%", background:current.color, width:`${((step+1)/STEPS.length)*100}%`, transition:"width 0.4s" }} />
        </div>

        {/* Dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, padding:"18px 0 0" }}>
          {STEPS.map((_,i) => (
            <div key={i} style={{ width:i===step?22:7, height:7, borderRadius:4, background:i<=step?current.color:"#1e2130", transition:"all 0.3s" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding:"24px 40px 32px" }}>
          {/* Icon */}
          <div style={{ textAlign:"center", fontSize:36, marginBottom:8, color:current.color, filter:`drop-shadow(0 0 16px ${current.color}80)` }}>
            {current.icon}
          </div>

          {/* Title */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:24, color:"#e8eaf0", fontWeight:700, marginBottom:6 }}>
              {current.title}
            </div>
            <div style={{ fontFamily:"monospace", fontSize:9, color:current.color, letterSpacing:"0.12em" }}>
              {current.sub}
            </div>
          </div>

          {/* Visual placeholder */}
          <div style={{ height:8, background:`${current.color}15`, borderRadius:4, marginBottom:20, border:`1px solid ${current.color}20` }} />

          {/* Body */}
          <p style={{ fontFamily:"Georgia,serif", fontSize:14, color:"#7a8098", lineHeight:1.75, textAlign:"center", marginBottom:current.steps ? 16 : 24 }}>
            {current.body}
          </p>

          {/* Steps */}
          {current.steps && (
            <div style={{ marginBottom:24 }}>
              {current.steps.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", background:`${current.color}15`, border:`1px solid ${current.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontSize:10, color:current.color, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:"#7a8098" }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, justifyContent:"center", alignItems:"center" }}>
            {step > 0 && (
              <button onClick={() => setStep(s=>s-1)} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #1e2130", background:"transparent", color:"#4a4f6a", fontFamily:"monospace", fontSize:12, cursor:"pointer" }}>
                ← Back
              </button>
            )}
            <button
              onClick={isLast ? finish : next}
              disabled={saving}
              style={{ padding:"13px 36px", borderRadius:8, border:"none", background:saving?"#1e2130":current.color, color:saving?"#4a4f6a":"#0d0f14", fontFamily:"monospace", fontSize:13, fontWeight:700, cursor:saving?"wait":"pointer", boxShadow:saving?"none":`0 4px 24px ${current.color}50`, transition:"all 0.2s" }}>
              {saving ? "Saving..." : current.btn}
            </button>
          </div>

          {/* Skip — returning users only */}
          {!isNew && (
            <div style={{ textAlign:"center", marginTop:14 }}>
              <button onClick={skip} style={{ background:"none", border:"none", color:"#3a404f", fontFamily:"monospace", fontSize:10, cursor:"pointer", textDecoration:"underline" }}>
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
