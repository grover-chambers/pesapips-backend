import { useState, useEffect, useRef } from "react"

// ── FONTS: DM Serif Display + DM Sans ──────────────────────────────────────
// Injected via style tag below

// ── COLOR TOKENS ──────────────────────────────────────────────────────────
// Background:  #1a1d23 (dark charcoal, not black)
// Surface:     #22262f  /  #2a2f3a
// Border:      rgba(255,255,255,0.08)
// Gold:        #d4a843   (muted gold, not harsh yellow)
// Green:       #3dd68c
// Red:         #f06b6b
// Text:        #f0eff0  /  #a8adb8  /  #6b7280

const C = {
  bg:       "#171a20",
  surface:  "#1f2330",
  surface2: "#262c3a",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  gold:     "#d4a843",
  goldDim:  "rgba(212,168,67,0.10)",
  goldGlow: "rgba(212,168,67,0.20)",
  green:    "#3dd68c",
  red:      "#f06b6b",
  blue:     "#5b9cf6",
  text:     "#edeef0",
  text2:    "#9aa0b0",
  text3:    "#5a6070",
  mono:     "'DM Mono', 'Courier New', monospace",
  display:  "'DM Serif Display', Georgia, serif",
  sans:     "'DM Sans', system-ui, sans-serif",
}

// ── TICKER DATA ────────────────────────────────────────────────────────────
const INITIAL_PRICES = {
  "XAU/USD":  { price: 2341.20, base: 2341.20 },
  "EUR/USD":  { price: 1.0842,  base: 1.0842  },
  "GBP/USD":  { price: 1.2634,  base: 1.2634  },
  "USD/JPY":  { price: 149.82,  base: 149.82  },
  "ADA/USD":  { price: 0.4521,  base: 0.4521  },
  "BTC/USD":  { price: 68420.0, base: 68420.0 },
  "ETH/USD":  { price: 3821.50, base: 3821.50 },
  "GBP/JPY":  { price: 189.34,  base: 189.34  },
  "NASDAQ":   { price: 17842.3, base: 17842.3 },
  "DOW":      { price: 38920.0, base: 38920.0 },
  "S&P 500":  { price: 5118.20, base: 5118.20 },
}

function formatPrice(symbol, price) {
  if (["BTC/USD","DOW","NASDAQ","XAU/USD","ETH/USD","S&P 500"].includes(symbol)) {
    return price.toFixed(2)
  }
  if (["USD/JPY","GBP/JPY"].includes(symbol)) return price.toFixed(3) 
    return price.toFixed(4)

}


// ── TICKER COMPONENT ───────────────────────────────────────────────────────
function TickerBar() {
  const [prices, setPrices] = useState(INITIAL_PRICES)

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(sym => {
          const volatility = sym === "BTC/USD" ? 0.0008
            : sym === "XAU/USD" ? 0.0003
            : sym === "NASDAQ" || sym === "DOW" || sym === "S&P 500" ? 0.0002
            : 0.0001
          const delta = next[sym].price * volatility * (Math.random() - 0.49)
          next[sym] = { ...next[sym], price: next[sym].price + delta }
        })
        return next
      })
    }, 1800)
    return () => clearInterval(id)
  }, [])

  const items = Object.entries(prices)

  return (
    <div style={{
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      overflow: "hidden",
      height: 36,
      display: "flex",
      alignItems: "center",
      position: "relative",
    }}>
      {/* fade edges */}
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:60,background:`linear-gradient(90deg,${C.surface},transparent)`,zIndex:2 }}/>
      <div style={{ position:"absolute",right:0,top:0,bottom:0,width:60,background:`linear-gradient(270deg,${C.surface},transparent)`,zIndex:2 }}/>

      <div style={{
        display: "flex",
        gap: 0,
        animation: "ticker 40s linear infinite",
        whiteSpace: "nowrap",
        alignItems: "center",
      }}>
        {[...items, ...items].map(([sym, data], i) => {
          const change = ((data.price - data.base) / data.base) * 100
          const up = change >= 0
          return (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0 28px",
              borderRight: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, letterSpacing: "0.05em" }}>{sym}</span>
              <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.text }}>{formatPrice(sym, data.price)}</span>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: up ? C.green : C.red }}>
                {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── NAV ────────────────────────────────────────────────────────────────────
function Nav({ activeSection }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  const links = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features",     href: "#features"     },
    { label: "Blog",          href: "/blog"         },
    { label: "Pricing",      href: "#pricing"      },
    { label: "Reviews",      href: "#reviews"      },
    { label: "About",        href: "#about"        },
    { label: "Contact",      href: "#contact"      },
  ]

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      background: scrolled ? `rgba(23,26,32,0.97)` : C.bg,
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.border2 : C.border}`,
      transition: "all 0.3s",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 40px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo.png" alt="PesaPips" style={{width:34,height:34,borderRadius:8}} />
          <span style={{ fontFamily:C.display, fontSize:20, color:C.text, letterSpacing:"-0.01em" }}>PesaPips</span>
          <span style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.18em", opacity:0.8 }}>AI</span>
        </div>

        {/* Links */}
        <div className="nav-links" style={{ display:"flex", alignItems:"center", gap:4 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} style={{
              padding:"6px 14px", borderRadius:6,
              fontFamily:C.sans, fontSize:14, fontWeight:500,
              color: activeSection === l.href.slice(1) ? C.gold : C.text2,
              textDecoration:"none", transition:"color 0.2s",
              background: activeSection === l.href.slice(1) ? C.goldDim : "transparent",
            }}
            onMouseEnter={e=>e.currentTarget.style.color=C.gold}
            onMouseLeave={e=>e.currentTarget.style.color=activeSection===l.href.slice(1)?C.gold:C.text2}
            >{l.label}</a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display:"flex", gap:10 }}>
          <a href="/login" style={{
            padding:"9px 20px", borderRadius:8,
            fontFamily:C.sans, fontSize:14, fontWeight:600,
            color:C.text2, textDecoration:"none",
            border:`1px solid ${C.border2}`,
            transition:"all 0.2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2}}
          >Sign in</a>
          <a href="/register" style={{
            padding:"9px 22px", borderRadius:8,
            fontFamily:C.sans, fontSize:14, fontWeight:700,
            color:"#0d0f14", background:C.gold, textDecoration:"none",
            transition:"all 0.2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="#e8bb55";e.currentTarget.style.transform="translateY(-1px)"}}
          onMouseLeave={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.transform="translateY(0)"}}
          >Get started free</a>
        </div>
      </div>
    </nav>
  )
}

// ── SECTION WRAPPER ────────────────────────────────────────────────────────
function Section({ id, children, style={} }) {
  return (
    <section id={id} style={{ padding:"100px 40px", maxWidth:1200, margin:"0 auto", ...style }}>
      {children}
    </section>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:8,
      fontFamily:C.mono, fontSize:10, color:C.gold,
      letterSpacing:"0.2em", textTransform:"uppercase",
      marginBottom:16,
    }}>
      <span style={{ width:20, height:1, background:C.gold, display:"inline-block" }}/>
      {children}
      <span style={{ width:20, height:1, background:C.gold, display:"inline-block" }}/>
    </div>
  )
}

function H2({ children }) {
  return (
    <h2 style={{
      fontFamily:C.display, fontSize:"clamp(30px,4vw,46px)",
      fontWeight:400, letterSpacing:"-0.02em",
      color:C.text, lineHeight:1.15, marginBottom:16,
    }}>{children}</h2>
  )
}

// ── HERO ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      {/* Hero background image */}
      <div style={{
        position:"absolute", inset:0, zIndex:0,
        backgroundImage:`url('/hero background.jpg')`,
        backgroundSize:"cover", backgroundPosition:"center",
        filter:"brightness(0.35)",
      }}/>
      {/* Gold overlay */}
      <div style={{
        position:"absolute", inset:0, zIndex:0,
        background:"linear-gradient(135deg, rgba(23,26,32,0.7) 0%, rgba(212,168,67,0.03) 50%, rgba(23,26,32,0.9) 100%)",
      }}/>
    <section style={{
      minHeight:"90vh", display:"flex", alignItems:"center",
      padding:"80px 40px", maxWidth:1200, margin:"0 auto",
      position:"relative", zIndex:1,
    }}>
      {/* Ambient glow */}
      <div style={{
        position:"absolute", top:"30%", left:"55%",
        width:700, height:500, borderRadius:"50%",
        background:`radial-gradient(ellipse, rgba(212,168,67,0.08) 0%, transparent 65%)`,
        pointerEvents:"none",
      }}/>

      <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center", width:"100%" }}>
        {/* Left */}
        <div>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"5px 14px", borderRadius:20,
            background:C.goldDim, border:`1px solid rgba(212,168,67,0.2)`,
            marginBottom:32,
          }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:C.green, animation:"pulse 2s infinite" }}/>
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.gold }}>AI Engine · Live</span>
          </div>

          <h1 style={{
            fontFamily:C.display,
            fontSize:"clamp(38px,4.5vw,64px)",
            fontWeight:400, letterSpacing:"-0.03em",
            lineHeight:1.1, color:C.text, marginBottom:24,
          }}>
            Stop guessing.<br/>
            <span style={{ color:C.gold }}>Trade with structured</span><br/>
            intelligence.
          </h1>

          <p style={{
            fontFamily:C.sans, fontSize:17, lineHeight:1.8,
            color:C.text2, marginBottom:40, maxWidth:480,
          }}>
            PesaPips AI connects directly to your MT5 broker account and executes trades automatically — using a transparent, fully customisable AI engine built for Gold, Forex and indices.
          </p>

          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <a href="/register" style={{
              padding:"14px 32px", borderRadius:10,
              fontFamily:C.sans, fontSize:16, fontWeight:700,
              color:"#0d0f14", background:C.gold, textDecoration:"none",
              transition:"all 0.2s", display:"inline-block",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="#e8bb55";e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.transform="translateY(0)"}}
            >Start free — no card needed</a>

            <a href="#how-it-works" style={{
              padding:"14px 28px", borderRadius:10,
              fontFamily:C.sans, fontSize:16, fontWeight:600,
              color:C.text2, textDecoration:"none",
              border:`1px solid ${C.border2}`, display:"inline-block",
              transition:"all 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2}}
            >See how it works →</a>
          </div>

          {/* Trust row */}
          <div style={{ display:"flex", gap:32, marginTop:52, flexWrap:"wrap" }}>
            {[["100%","Transparent logic"],["Zero","Black boxes"],["Any MT5","Broker compatible"],["KES-first","Built in Kenya"]].map(([v,l])=>(
              <div key={l}>
                <div style={{ fontFamily:C.mono, fontSize:20, fontWeight:700, color:C.gold }}>{v}</div>
                <div style={{ fontFamily:C.sans, fontSize:12, color:C.text3, marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mock dashboard card */}
        <div style={{
          background:C.surface,
          border:`1px solid ${C.border2}`,
          borderRadius:20, padding:28,
          boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", textTransform:"uppercase" }}>Account Balance</div>
              <div style={{ fontFamily:C.mono, fontSize:28, fontWeight:700, color:C.text, marginTop:4 }}>$2,847.00</div>
            </div>
            <div style={{ padding:"6px 14px", background:"rgba(61,214,140,0.1)", border:"1px solid rgba(61,214,140,0.2)", borderRadius:20 }}>
              <span style={{ fontFamily:C.mono, fontSize:11, color:C.green }}>● AI Active</span>
            </div>
          </div>

          {/* Fake equity bars */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:60, marginBottom:20 }}>
            {[40,55,48,62,58,70,65,78,72,85,80,92,88,95,90,100,96,92,98,100].map((h,i)=>(
              <div key={i} style={{
                flex:1, borderRadius:2,
                height:`${h}%`,
                background:i>14
                  ? `rgba(212,168,67,0.7)`
                  : `rgba(212,168,67,0.2)`,
              }}/>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            {[["Today PnL","+$142","green"],["Winrate","64%","gold"],["Drawdown","-4.8%","red"]].map(([l,v,col])=>(
              <div key={l} style={{ background:C.surface2, borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase" }}>{l}</div>
                <div style={{ fontFamily:C.mono, fontSize:16, fontWeight:700, marginTop:6,
                  color: col==="green"?C.green : col==="gold"?C.gold : C.red
                }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:16, padding:"12px 14px", background:C.surface2, borderRadius:10 }}>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Latest signal</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontFamily:C.sans, fontSize:14, fontWeight:600, color:C.text }}>XAU/USD · M5</span>
                <span style={{ fontFamily:C.mono, fontSize:10, color:C.text3, marginLeft:10 }}>EMA + MACD cross</span>
              </div>
              <div style={{ padding:"4px 12px", background:"rgba(61,214,140,0.12)", border:"1px solid rgba(61,214,140,0.25)", borderRadius:6 }}>
                <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:700, color:C.green }}>BUY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </div>
  )
}


// ── EA DOWNLOAD SECTION ───────────────────────────────────────────────────
function EADownload() {
  return (
    <div style={{ background:`rgba(255,255,255,0.01)`, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <Section id="ea-download">
        <div className="ea-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:20, background:"rgba(91,156,246,0.1)", border:"1px solid rgba(91,156,246,0.2)", marginBottom:24 }}>
              <span style={{ fontFamily:C.mono, fontSize:11, color:"#5b9cf6" }}>Required for live trading</span>
            </div>
            <h2 style={{ fontFamily:C.display, fontSize:"clamp(28px,3.5vw,42px)", fontWeight:400, letterSpacing:"-0.02em", color:C.text, lineHeight:1.15, marginBottom:16 }}>
              Download the<br/><span style={{ color:C.gold }}>PesaPips EA</span>
            </h2>
            <p style={{ fontFamily:C.sans, fontSize:16, lineHeight:1.85, color:C.text2, marginBottom:32 }}>
              The PesaPips Expert Advisor is a small file that installs in MetaTrader 5 and creates a live bridge between your broker and the AI engine. It takes under 2 minutes to set up.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:36 }}>
              {[
                ["01", "Download the .mq5 file from your dashboard after signing up"],
                ["02", "Open MetaTrader 5 → File → Open Data Folder → MQL5 → Experts"],
                ["03", "Copy PesaPipsEA.mq5 into the Experts folder"],
                ["04", "Restart MT5, drag the EA onto any chart, enable Allow DLL imports"],
              ].map(([n,s]) => (
                <div key={n} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(212,168,67,0.1)", border:"1px solid rgba(212,168,67,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.mono, fontSize:10, color:C.gold, flexShrink:0, marginTop:2 }}>{n}</div>
                  <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.7, margin:0 }}>{s}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <a href="/register" style={{ padding:"13px 28px", borderRadius:10, fontFamily:C.sans, fontSize:15, fontWeight:700, color:"#0d0f14", background:C.gold, textDecoration:"none", transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#e8bb55"}
                onMouseLeave={e=>e.currentTarget.style.background=C.gold}
              >Sign up to download →</a>
              <a href="#how-it-works" style={{ padding:"13px 20px", borderRadius:10, fontFamily:C.sans, fontSize:15, fontWeight:600, color:C.text2, border:`1px solid ${C.border2}`, textDecoration:"none", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2}}
              >See how it works</a>
            </div>
          </div>

          {/* Code preview */}
          <div style={{ background:"#0d0f14", borderRadius:16, overflow:"hidden", border:"1px solid #1e2130", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ background:"#1a1d2e", padding:"12px 18px", display:"flex", alignItems:"center", gap:8 }}>
              {["#f06b6b","#f5c842","#3dd68c"].map((c,i) => <div key={i} style={{ width:11, height:11, borderRadius:"50%", background:c }} />)}
              <span style={{ fontFamily:C.mono, fontSize:11, color:"#4a4f6a", marginLeft:8 }}>PesaPipsEA.mq5</span>
            </div>
            <div style={{ padding:"20px 24px", fontFamily:C.mono, fontSize:12, lineHeight:2 }}>
              {[
                ["comment", "// PesaPips Expert Advisor v2.0"],
                ["comment", "// Connects MT5 → AI Signal Engine"],
                ["blank",   ""],
                ["purple",  'input string SERVER = "localhost";'],
                ["purple",  "input int    PORT   = 9090;"],
                ["purple",  "input bool   AUTO   = true;"],
                ["blank",   ""],
                ["dim",     "CTradingEngine bridge;"],
                ["blank",   ""],
                ["text",    "void OnTick() {"],
                ["green",   "  bridge.sync();"],
                ["green",   "  if (AUTO && bridge.hasSignal()) {"],
                ["blue",    "    bridge.execute();"],
                ["text",    "  }"],
                ["text",    "}"],
              ].map(([type, line], i) => (
                <div key={i} style={{ color: type==="comment"?"#4a4f6a": type==="purple"?"#a78bfa": type==="green"?"#3dd68c": type==="blue"?"#5b9cf6": type==="dim"?"#3a404f": "#c8cce8" }}>
                  {line || " "}
                </div>
              ))}
            </div>
            <div style={{ padding:"12px 24px", borderTop:"1px solid #1e2130", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#3dd68c", boxShadow:"0 0 8px #3dd68c", animation:"pulse 2s infinite" }} />
              <span style={{ fontFamily:C.mono, fontSize:10, color:"#3dd68c" }}>Bridge connected · HFM Demo · $98,989</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n:"01", title:"Create your account", desc:"Sign up free in under 60 seconds. No credit card, no commitment. Your account is live immediately." },
    { n:"02", title:"Connect your MT5 broker", desc:"Link any MT5-compatible broker — ICMarkets, Exness, FBS, Deriv and more. Your credentials are encrypted end-to-end using AES-256. We never see your password in plain text." },
    { n:"03", title:"Choose and customise a strategy", desc:"Select EMA_RSI_MACD or build your own parameter set. Adjust every variable: EMA lengths, RSI levels, MACD settings, risk percentage, SL and TP in pips." },
    { n:"04", title:"Backtest, then go live", desc:"Run your strategy against historical OHLCV data before risking a single cent. Review winrate, profit factor and max drawdown. When you're satisfied, activate live trading with one click." },
  ]

  return (
    <div style={{ background:`rgba(255,255,255,0.01)`, padding:"100px 0", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <Section id="how-it-works">
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <SectionLabel>How it works</SectionLabel>
          <H2>Up and trading in four steps</H2>
          <p style={{ fontFamily:C.sans, fontSize:17, color:C.text2, maxWidth:520, margin:"0 auto" }}>
            No coding required. No confusing dashboards. Just a clear path from sign-up to live automation.
          </p>
        </div>

        <div className="how-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20 }}>
          {steps.map((s,i)=>(
            <div key={i} style={{
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:16, padding:"36px 28px",
              position:"relative", overflow:"hidden",
              transition:"border-color 0.2s, transform 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`rgba(212,168,67,0.3)`;e.currentTarget.style.transform="translateY(-4px)"}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)"}}
            >
              <div style={{
                position:"absolute", top:16, right:20,
                fontFamily:C.mono, fontSize:52, fontWeight:700,
                color:"rgba(212,168,67,0.06)", lineHeight:1,
              }}>{s.n}</div>
              <div style={{ fontFamily:C.mono, fontSize:10, color:C.gold, letterSpacing:"0.15em", marginBottom:14 }}>STEP {s.n}</div>
              <h3 style={{ fontFamily:C.display, fontSize:20, color:C.text, marginBottom:12, lineHeight:1.2 }}>{s.title}</h3>
              <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── FEATURES ──────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon:"◈", title:"AI Signal Engine",
      short:"EMA, RSI, MACD, Volume analysis and Market Regime detection — one disciplined decision system.",
      long:`The engine evaluates three independent indicators simultaneously before issuing any signal. EMA 9/21/50 establishes the trend direction. RSI confirms whether the asset is oversold or overbought. MACD crossover acts as the timing trigger. All three must align before a trade is opened — eliminating the noise-trading that destroys most retail accounts. You can adjust every single parameter to match your own backtested edge.`,
    },
    {
      icon:"🔐", title:"Bank-grade Credential Security",
      short:"Your MT5 password is encrypted before it ever touches our database.",
      long:`We use Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256) to encrypt your MT5 account password at the point of entry. The encryption key is stored separately from the database. This means even if our database were compromised, your broker credentials would be unreadable. We never log, display or transmit your password in plain text at any point in the system.`,
    },
    {
      icon:"⚡", title:"Any Broker, Any Account",
      short:"Works with every MT5-compatible broker worldwide — no switching required.",
      long:`PesaPips connects via the official MetaTrader 5 API. If your broker supports MT5 — and nearly all major retail brokers do — it works with PesaPips. ICMarkets, Exness, FBS, Deriv, Pepperstone, XM, HotForex and hundreds more. You keep your existing account, your existing spreads, and your existing relationship with your broker. We simply add the AI execution layer on top.`,
    },
    {
      icon:"◎", title:"Full Parameter Transparency",
      short:"Every variable is visible, editable and explained — no black box ever.",
      long:`Most commercial trading bots hide their logic. PesaPips does the opposite. Every indicator setting, every risk parameter, every signal condition is exposed in your dashboard and fully editable. You can read exactly why the AI opened or closed a trade — the signal, the confidence score, the indicator values at the time. If you want to tighten the RSI threshold from 30 to 25, or widen the stop loss from 15 pips to 20, you do it with one slider and it applies instantly.`,
    },
    {
      icon:"△", title:"Risk Manager Built In",
      short:"Automatic position sizing, drawdown limits and trade caps — always enforced.",
      long:`The risk manager runs before every trade execution. It calculates lot size based on your account balance and your chosen risk-per-trade percentage — so the engine never risks more than you've allowed. It enforces a maximum open-trades limit so you can't accidentally stack 10 positions on one asset. It monitors real-time drawdown and automatically pauses trading if your account drops beyond your set threshold. Capital preservation is treated as the primary objective, profit as secondary.`,
    },
    {
      icon:"◇", title:"Backtester with Real Stats",
      short:"Test any strategy on historical data before risking real money.",
      long:`Before you go live, run your exact parameter set against real historical OHLCV candle data. The backtester reports: total trades taken, win rate percentage, profit factor (gross profit ÷ gross loss), maximum drawdown, total return percentage and final balance. This lets you validate that your strategy has a positive expectancy on past data before activating it with real funds. You can iterate — adjust EMA lengths, tighten RSI, change SL/TP — and re-run in seconds.`,
    },
    {
      icon:"📰", title:"News Event Filter",
      short:"The bot automatically pauses during CPI, NFP and other high-impact events.",
      long:`High-impact economic news events — US CPI, NFP, FOMC decisions, GDP releases — cause violent, unpredictable price spikes that destroy trend-following strategies. The PesaPips news filter maintains a calendar of scheduled events. When a high-impact event is within two hours, the engine pauses new trade entries. Open trades are protected by their stop losses. Once the event window passes, the engine resumes automatically. You can configure which event categories trigger the pause, or disable the filter entirely if your strategy is news-resistant.`,
    },
    {
      icon:"📊", title:"Performance Analytics Dashboard",
      short:"A clear, real-time view of every metric that matters to your account.",
      long:`Your dashboard shows live account balance and equity, real-time open trade P&L, daily and all-time profit and loss, trade history with every entry and exit price, win rate and profit factor calculated continuously, and a running equity curve so you can see your account growth at a glance. All metrics update in real time as the engine runs. Nothing is hidden, delayed or aggregated in a way that obscures the true picture of your account performance.`,
    },
    {
      icon:"🧬", title:"Market Intelligence Engine",
      short:"AI detects the current market regime and tells you exactly which strategy fits.",
      long:`Most trading bots run one strategy blindly regardless of market conditions. PesaPips Market Intel analyses live OHLCV data across multiple indicators — ADX, ATR, RSI, EMA alignment and Bollinger Band width — to classify the current market as Trending, Ranging, Volatile or Breakout. It then scores all your available strategies against that regime and recommends the best fit. Elite and Platinum users also see historical pattern matching: of the last 20 similar market setups, how many resolved upward vs downward. You can execute the recommended signal and run a backtest — all from one screen. This is the closest thing to having a professional analyst sit next to you and read the chart before every trade.`,
    },
    {
      icon:"📓", title:"Trading Journal",
      short:"Log every trade, track your psychology and build a record of your edge.",
      long:`Professional traders keep journals. Not because they enjoy paperwork — because pattern recognition across hundreds of trades is impossible without a written record. The PesaPips Trading Journal lets you log every trade with entry price, exit price, P&L, strategy used, market conditions, and your emotional state at the time of the trade. Over weeks and months, patterns emerge: which strategies you execute best, which sessions you overtrade, which emotional states precede your worst decisions. The journal is private to your account, fully searchable, and exportable. It is one of the most underrated features of the platform — serious traders use it religiously.`,
    },
    {
      icon:"🎯", title:"Strategy Marketplace (Coming Soon)",
      short:"Buy, sell and share backtested strategies with other PesaPips users.",
      long:`We are building a peer strategy marketplace where verified traders can publish their parameter sets — complete with backtested performance statistics — for other users to subscribe to or purchase. Every published strategy will include its full backtest report, drawdown history and live forward-test results. You will be able to run someone else's strategy on your own account with your own risk settings, or monetise your own edge by publishing it to the community.`,
    },
  ]

  const [expanded, setExpanded] = useState(null)

  return (
    <Section id="features" style={{}}>
      <div style={{ textAlign:"center", marginBottom:64 }}>
        <SectionLabel>Features</SectionLabel>
        <H2>Everything you need.<br/>Nothing you don't.</H2>
        <p style={{ fontFamily:C.sans, fontSize:17, color:C.text2, maxWidth:540, margin:"0 auto" }}>
          Click any feature to read the full explanation — no marketing fluff, just exactly how it works.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16 }}>
        {features.map((f,i)=>(
          <div key={i}
            onClick={()=>setExpanded(expanded===i?null:i)}
            style={{
              background: expanded===i ? C.surface2 : C.surface,
              border:`1px solid ${expanded===i ? "rgba(212,168,67,0.3)" : C.border}`,
              borderRadius:14, padding:"24px 24px",
              cursor:"pointer", transition:"all 0.2s",
            }}
            onMouseEnter={e=>{if(expanded!==i){e.currentTarget.style.borderColor="rgba(212,168,67,0.2)"}}}
            onMouseLeave={e=>{if(expanded!==i){e.currentTarget.style.borderColor=C.border}}}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>{f.icon}</span>
                <h3 style={{ fontFamily:C.sans, fontSize:16, fontWeight:700, color:C.text }}>{f.title}</h3>
              </div>
              <span style={{ color:C.text3, fontSize:16, flexShrink:0, marginLeft:8 }}>{expanded===i ? "−" : "+"}</span>
            </div>
            <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.7 }}>{f.short}</p>
            {expanded===i && (
              <p style={{
                fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.85,
                marginTop:16, paddingTop:16,
                borderTop:`1px solid ${C.border}`,
              }}>{f.long}</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── PRICING ────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name:"Free", price:"Free", period:"",
      desc:"Start trading with AI signals. No card needed.",
      features:[
        "1 MT5 account",
        "1 active strategy (default or library)",
        "Build 1 custom strategy",
        "Live trade metrics",
        "5 AI signal runs/day",
        "Backtest (100 candles)",
        "Community support",
      ],
      cta:"Get started free", highlight:false, color:"#9aa0b0",
    },
    {
      name:"Pro", price:"KSh 2,500", period:"/month",
      desc:"Full automation for active traders who want the edge.",
      features:[
        "3 MT5 accounts",
        "Default + 1 library strategy",
        "Build up to 3 custom strategies",
        "Trading Journal",
        "Backtest analytics (500 candles)",
        "Unlimited AI signal runs",
        "Email support",
      ],
      cta:"Start Pro", highlight:true, color:"#5b9cf6",
    },
    {
      name:"Elite", price:"KSh 5,000", period:"/month",
      desc:"For serious traders managing multiple strategies.",
      features:[
        "5 MT5 accounts",
        "Default + library + 1 custom strategy",
        "Build up to 5 custom strategies",
        "Full performance analytics",
        "Backtest (1000 candles)",
        "Priority support",
      ],
      cta:"Go Elite", highlight:false, color:"#d4a843",
    },
    {
      name:"Platinum", price:"KSh 9,000", period:"/month",
      desc:"Unlimited everything. For professional traders.",
      features:[
        "Unlimited MT5 accounts",
        "Unlimited strategy combinations",
        "Unlimited custom strategies",
        "Full analytics, no restrictions",
        "Backtest (2000 candles)",
        "Dedicated account manager",
        "API access",
      ],
      cta:"Go Platinum", highlight:false, color:"#e2c4f0",
    },
  ]

  return (
    <div style={{ background:`rgba(255,255,255,0.01)`, padding:"100px 0", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <Section id="pricing">
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <SectionLabel>Pricing</SectionLabel>
          <H2>Simple, honest pricing</H2>
          <p style={{ fontFamily:C.sans, fontSize:17, color:C.text2 }}>No hidden fees. No performance cuts. Cancel any time.</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20, alignItems:"start" }}>
          {plans.map((p,i)=>(
            <div key={i} style={{
              background: p.highlight ? `rgba(212,168,67,0.05)` : C.surface,
              border:`1px solid ${p.highlight ? "rgba(212,168,67,0.35)" : C.border}`,
              borderRadius:16, padding:"36px 28px",
              position:"relative",
            }}>
              {p.highlight && (
                <div style={{
                  position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)",
                  background:C.gold, color:"#0d0f14",
                  fontFamily:C.mono, fontWeight:700, fontSize:10,
                  padding:"4px 18px", borderRadius:20, letterSpacing:"0.12em", whiteSpace:"nowrap",
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontFamily:C.mono, fontSize:10, color:p.color||C.text3, letterSpacing:"0.15em", marginBottom:8 }}>{p.name.toUpperCase()}</div>
              <div style={{ marginBottom:8 }}>
                <span style={{ fontFamily:C.mono, fontSize:30, fontWeight:700, color:p.color||C.text }}>{p.price}</span>
                <span style={{ fontFamily:C.sans, fontSize:14, color:C.text3 }}>{p.period}</span>
              </div>
              <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, marginBottom:28, lineHeight:1.6 }}>{p.desc}</p>
              <ul style={{ listStyle:"none", marginBottom:32 }}>
                {p.features.map((f,j)=>(
                  <li key={j} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:11, fontFamily:C.sans, fontSize:14, color:C.text2 }}>
                    <span style={{ color:C.green, fontSize:13, flexShrink:0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a href="/register" style={{
                display:"block", textAlign:"center",
                padding:"13px", borderRadius:8,
                fontFamily:C.sans, fontSize:15, fontWeight:700,
                background:p.highlight?C.gold:"transparent",
                border:p.highlight?"none":`1px solid ${C.border2}`,
                color:p.highlight?"#0d0f14":C.text2,
                textDecoration:"none", transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.opacity="0.85"}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}
              >{p.cta}</a>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── REVIEWS ────────────────────────────────────────────────────────────────
function Reviews() {
  const reviews = [
    { name:"Brian M.", location:"Nairobi", plan:"Pro", stars:5,
      text:"I was skeptical at first — I've tried three other bots and they all blew my account within a month. PesaPips is different because I can actually see what it's doing and why. The backtester alone is worth the subscription fee." },
    { name:"Aisha K.", location:"Mombasa", plan:"Pro", stars:5,
      text:"The news filter saved me during the last NFP release. I had two open Gold trades and the bot paused perfectly, let the spike pass, then resumed. That one feature has paid for itself many times over." },
    { name:"David O.", location:"Kisumu", plan:"Elite", stars:5,
      text:"Running three MT5 accounts simultaneously across different brokers. The dashboard gives me a consolidated view of everything. The risk manager keeps my drawdown consistent across all three. Genuinely impressed." },
    { name:"Mercy W.", location:"Nakuru", plan:"Starter", stars:4,
      text:"Started on the free plan to test it before committing. The signal viewer helped me understand the EMA/RSI logic and I traded manually based on it for two weeks. Now I'm on Pro and it just runs itself." },
    { name:"James N.", location:"Nairobi", plan:"Pro", stars:5,
      text:"The parameter customisation is what sets this apart. I spent a weekend backtesting different EMA combinations on XAUUSD M15 and found a setting with 68% winrate. Now it runs live and tracks the backtest results closely." },
    { name:"Faith A.", location:"Eldoret", plan:"Pro", stars:5,
      text:"I'm not a technical trader — I came in knowing almost nothing about indicators. The learning hub explained EMA and MACD in plain language. Within two weeks I understood what the bot was doing. Now I trust it." },
  ]

  return (
    <Section id="reviews">
      <div style={{ textAlign:"center", marginBottom:64 }}>
        <SectionLabel>Reviews</SectionLabel>
        <H2>What traders are saying</H2>
        <p style={{ fontFamily:C.sans, fontSize:17, color:C.text2, maxWidth:500, margin:"0 auto" }}>
          Real feedback from traders across Kenya using PesaPips every day.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        {reviews.map((r,i)=>(
          <div key={i} style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:14, padding:"28px",
            transition:"border-color 0.2s",
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.border2}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
          >
            <div style={{ display:"flex", gap:2, marginBottom:16 }}>
              {Array(r.stars).fill(0).map((_,j)=>(
                <span key={j} style={{ color:C.gold, fontSize:14 }}>★</span>
              ))}
            </div>
            <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.85, marginBottom:20 }}>"{r.text}"</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:C.sans, fontSize:14, fontWeight:700, color:C.text }}>{r.name}</div>
                <div style={{ fontFamily:C.sans, fontSize:12, color:C.text3 }}>{r.location}</div>
              </div>
              <div style={{
                padding:"3px 10px", borderRadius:20,
                background:C.goldDim, border:`1px solid rgba(212,168,67,0.15)`,
                fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.1em",
              }}>{r.plan.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── ABOUT ─────────────────────────────────────────────────────────────────
function About() {
  return (
    <div style={{ position:"relative", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:`url('/about us background.jpg')`, backgroundSize:"cover", backgroundPosition:"center", filter:"brightness(0.45)" }}/>
      <div style={{ position:"absolute", inset:0, zIndex:0, background:"linear-gradient(135deg, rgba(23,26,32,0.65) 0%, rgba(23,26,32,0.45) 100%)" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
      <Section id="about">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
          <div>
            <SectionLabel>About us</SectionLabel>
            <H2>Built by Kenyan traders, for Kenyan traders</H2>
            <p style={{ fontFamily:C.sans, fontSize:16, color:C.text2, lineHeight:1.85, marginBottom:20 }}>
              We got tired of offshore trading bots priced in dollars, with customer support in different time zones, and logic that nobody could explain. When one of them blew a KSh 80,000 account in a single NFP spike, we decided to build our own.
            </p>
            <p style={{ fontFamily:C.sans, fontSize:16, color:C.text2, lineHeight:1.85, marginBottom:20 }}>
              PesaPips is built on the same quantitative infrastructure used by professional trading desks — EMA crossovers, RSI confirmation, MACD timing — but wrapped in an interface that any trader in Nairobi, Mombasa or Eldoret can understand and control without a finance degree.
            </p>
            <p style={{ fontFamily:C.sans, fontSize:16, color:C.text2, lineHeight:1.85 }}>
              We price in KES. We respond in your time zone. And we believe the best trading tool is one you understand completely — because you can only trust what you can see.
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { label:"Mission", text:"Make institutional-grade trading automation accessible to every independent trader in Kenya — at a price that makes sense." },
              { label:"Philosophy", text:"Transparency over complexity. A tool you understand will always outperform a black box you don't — because you'll trust it when it matters." },
              { label:"Risk stance", text:"We are a trading tool, not an investment manager. We will always tell you clearly: trading involves risk. No strategy wins every trade. Risk only what you can afford to lose." },
            ].map((item,i)=>(
              <div key={i} style={{
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:12, padding:"22px 24px",
              }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:8 }}>{item.label}</div>
                <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, lineHeight:1.8 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
      </div>
    </div>
  )
}

function BlogPreview() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("https://pesapips-backend.onrender.com/blog/published?limit=3")
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts?.slice(0, 3) || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <section style={{ background: "#171a20", padding: "80px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "047DM Mono047, monospace", fontSize: 10, color: "#d4a843", letterSpacing: "0.2em", marginBottom: 12 }}>LATEST FROM BLOG</div>
          <h2 style={{ fontFamily: "047DM Serif Display047, Georgia, serif", fontSize: "clamp(28px, 4vw, 40px)", color: "#edeef0", marginBottom: 16 }}>
            Trading Insights & Strategies
          </h2>
          <p style={{ fontFamily: "047DM Sans047, sans-serif", fontSize: 16, color: "#9aa0b0", maxWidth: 600, margin: "0 auto" }}>
            Expert analysis, proven strategies, and real trader experiences.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: "047DM Mono047, monospace", fontSize: 12, color: "#5a6070" }}>Loading articles...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: "047DM Sans047, sans-serif", fontSize: 14, color: "#9aa0b0" }}>No posts yet. Check back soon!</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 40 }}>
            {posts.map(post => (
              <a key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#1f2330",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "24px",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#d4a843"; e.currentTarget.style.transform = "translateY(-4px)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)" }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      fontFamily: "047DM Mono047, monospace",
                      fontSize: 9,
                      color: "#d4a843",
                      padding: "3px 8px",
                      background: "rgba(212,168,67,0.10)",
                      borderRadius: 4,
                      letterSpacing: "0.08em"
                    }}>{post.category?.toUpperCase()}</span>
                  </div>
                  <h3 style={{ fontFamily: "047DM Serif Display047, Georgia, serif", fontSize: 18, color: "#edeef0", marginBottom: 12, lineHeight: 1.3 }}>{post.title}</h3>
                  <p style={{ fontFamily: "047DM Sans047, sans-serif", fontSize: 13, color: "#9aa0b0", lineHeight: 1.6, marginBottom: 16 }}>
                    {post.excerpt?.slice(0, 100)}...
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "047DM Mono047, monospace", fontSize: 10, color: "#5a6070" }}>By {post.author_name}</span>
                    <span style={{ fontFamily: "047DM Mono047, monospace", fontSize: 10, color: "#5a6070" }}>👁 {post.views}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <a href="/blog" style={{ display: "inline-block", padding: "12px 32px", background: "#d4a843", color: "#000", borderRadius: 8, fontFamily: "047DM Mono047, monospace", fontSize: 12, fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em" }}>
            View All Articles →
          </a>
        </div>
      </div>
    </section>
  )
}

// ── CONTACT ────────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" })
  const [status, setStatus] = useState(null) // null | "sending" | "sent" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      setStatus("error")
      return
    }
    setStatus("sending")
    // Will wire to backend /contact endpoint later
    await new Promise(r => setTimeout(r, 1200))
    setStatus("sent")
    setForm({ name:"", email:"", subject:"", message:"" })
  }

  const inputStyle = {
    width:"100%", padding:"13px 16px",
    background:C.surface2, border:`1px solid ${C.border2}`,
    borderRadius:8, fontFamily:C.sans, fontSize:15, color:C.text,
    outline:"none", transition:"border-color 0.2s",
  }

  return (
    <Section id="contact">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"start" }}>
        <div>
          <SectionLabel>Contact</SectionLabel>
          <H2>Get in touch</H2>
          <p style={{ fontFamily:C.sans, fontSize:16, color:C.text2, lineHeight:1.85, marginBottom:36 }}>
            Have a question about the platform, a strategy you want to discuss, or a partnership proposal? We respond to every message within 24 hours, Nairobi time.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { icon:"📧", label:"Email", value:"pesapipsai@gmail.com" },
              { icon:"💬", label:"WhatsApp", value:"+254 797 100144" },
              { icon:"✈️", label:"Telegram", value:"@pesapips_ai" },
              { icon:"🕐", label:"Response time", value:"Within 24 hours (Nairobi time)" },
            ].map((item,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{
                  width:40, height:40, borderRadius:10,
                  background:C.surface, border:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                  flexShrink:0,
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.12em", textTransform:"uppercase" }}>{item.label}</div>
                  <div style={{ fontFamily:C.sans, fontSize:15, color:C.text, marginTop:2 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:16, padding:36,
        }}>
          <h3 style={{ fontFamily:C.display, fontSize:22, color:C.text, marginBottom:24 }}>Send us a message</h3>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={{ fontFamily:C.sans, fontSize:13, color:C.text2, display:"block", marginBottom:6 }}>Your name</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                placeholder="Brian M." style={inputStyle}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.border2}
              />
            </div>
            <div>
              <label style={{ fontFamily:C.sans, fontSize:13, color:C.text2, display:"block", marginBottom:6 }}>Email address</label>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                placeholder="brian@email.com" type="email" style={inputStyle}
                onFocus={e=>e.target.style.borderColor=C.gold}
                onBlur={e=>e.target.style.borderColor=C.border2}
              />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontFamily:C.sans, fontSize:13, color:C.text2, display:"block", marginBottom:6 }}>Subject</label>
            <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
              style={{ ...inputStyle, cursor:"pointer" }}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border2}
            >
              <option value="">Select a topic...</option>
              <option value="general">General enquiry</option>
              <option value="technical">Technical support</option>
              <option value="billing">Billing & subscription</option>
              <option value="strategy">Strategy question</option>
              <option value="partnership">Partnership proposal</option>
            </select>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontFamily:C.sans, fontSize:13, color:C.text2, display:"block", marginBottom:6 }}>Message</label>
            <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})}
              placeholder="Tell us how we can help..."
              rows={5} style={{ ...inputStyle, resize:"vertical" }}
              onFocus={e=>e.target.style.borderColor=C.gold}
              onBlur={e=>e.target.style.borderColor=C.border2}
            />
          </div>

          {status === "error" && (
            <div style={{ fontFamily:C.sans, fontSize:13, color:C.red, marginBottom:16 }}>Please fill in your name, email and message.</div>
          )}
          {status === "sent" && (
            <div style={{ fontFamily:C.sans, fontSize:13, color:C.green, marginBottom:16 }}>Message sent — we'll get back to you within 24 hours.</div>
          )}

          <button type="submit" disabled={status==="sending"} style={{
            width:"100%", padding:"14px",
            background:status==="sent"?`rgba(61,214,140,0.15)`:C.gold,
            border:status==="sent"?`1px solid rgba(61,214,140,0.3)`:"none",
            borderRadius:8,
            fontFamily:C.sans, fontSize:16, fontWeight:700,
            color:status==="sent"?C.green:"#0d0f14",
            cursor:status==="sending"?"wait":"pointer",
            transition:"all 0.2s", opacity:status==="sending"?0.7:1,
          }}>
            {status==="sending" ? "Sending..." : status==="sent" ? "Message sent ✓" : "Send message"}
          </button>
        </form>
      </div>
    </Section>
  )
}

// ── CTA BANNER ─────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <div style={{ padding:"0 40px 100px", maxWidth:1200, margin:"0 auto" }}>
      <div style={{
        background:`rgba(212,168,67,0.05)`,
        border:`1px solid rgba(212,168,67,0.18)`,
        borderRadius:20, padding:"72px 60px", textAlign:"center",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{
          position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
          width:600, height:300,
          background:`radial-gradient(ellipse, rgba(212,168,67,0.07) 0%, transparent 65%)`,
          pointerEvents:"none",
        }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <h2 style={{ fontFamily:C.display, fontSize:"clamp(28px,4vw,48px)", color:C.text, marginBottom:16, letterSpacing:"-0.02em" }}>
            Ready to trade smarter?
          </h2>
          <p style={{ fontFamily:C.sans, fontSize:17, color:C.text2, marginBottom:36, maxWidth:440, margin:"0 auto 36px" }}>
            Join traders across Kenya already using PesaPips AI. Start free — go live when you're ready.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="/register" style={{
              padding:"15px 36px", borderRadius:10,
              fontFamily:C.sans, fontSize:16, fontWeight:700,
              color:"#0d0f14", background:C.gold, textDecoration:"none",
              transition:"all 0.2s", display:"inline-block",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="#e8bb55";e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.transform="translateY(0)"}}
            >Create your free account →</a>
            <a href="#contact" style={{
              padding:"15px 28px", borderRadius:10,
              fontFamily:C.sans, fontSize:16, fontWeight:600,
              color:C.text2, border:`1px solid ${C.border2}`, textDecoration:"none",
              transition:"all 0.2s", display:"inline-block",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.color=C.gold}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2}}
            >Talk to us first</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  const cols = {
    Product:  [
      { label: "Features",    href: "#features"     },
      { label: "Pricing",     href: "#pricing"      },
      { label: "Backtester",  href: "#how-it-works" },
      { label: "Strategies",  href: "#features"     },
      { label: "API Docs",    href: "/docs"         },
    ],
    Support:  [
      { label: "Help Center",        href: "#contact"  },
      { label: "Contact Us",         href: "#contact"  },
      { label: "WhatsApp Support",   href: "https://wa.me/254700000000" },
      { label: "Telegram Community", href: "https://t.me/pesapips_ai"   },
    ],
    Legal:    [
      { label: "Terms of Service", href: "/terms"   },
      { label: "Privacy Policy",   href: "/privacy" },
      { label: "Risk Disclaimer",  href: "/risk"    },
      { label: "Cookie Policy",    href: "/cookies" },
    ],
    Company:  [
      { label: "About Us",  href: "#about"   },
      { label: "Blog",      href: "/blog"    },
      { label: "Careers",   href: "/careers" },
      { label: "Press Kit", href: "/press"   },
    ],
  }

  return (
    <footer style={{ background:"#0f1117", borderTop:`1px solid ${C.border}`, padding:"64px 40px 32px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div className="footer-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:40, marginBottom:56, flexWrap:"wrap" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:32,height:32,background:C.gold,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:"#000" }}>P</div>
              <span style={{ fontFamily:C.display, fontSize:18, color:C.text }}>PesaPips AI</span>
            </div>
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.text3, lineHeight:1.8, maxWidth:220 }}>
              AI-guided trading automation for the modern Kenyan trader.
            </p>
            <div style={{ fontFamily:C.mono, fontSize:10, color:C.text3, marginTop:16, lineHeight:1.8 }}>
              Nairobi, Kenya<br/>
              pesapipsai@gmail.com
            </div>
          </div>

          {Object.entries(cols).map(([sec,links])=>(
            <div key={sec}>
              <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:16 }}>{sec}</div>
              {links.map(l=>(
                <a key={l.label} href={l.href} style={{
                  display:"block", fontFamily:C.sans, fontSize:13, color:C.text3,
                  textDecoration:"none", marginBottom:10, transition:"color 0.2s",
                }}
                onMouseEnter={e=>e.target.style.color=C.gold}
                onMouseLeave={e=>e.target.style.color=C.text3}
                target={l.href.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                >{l.label}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop:`1px solid ${C.border}`, paddingTop:24,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12,
        }}>
          <span style={{ fontFamily:C.mono, fontSize:11, color:C.text3 }}>
            © 2026 PesaPips Trading AI. All rights reserved.
          </span>
          <span style={{ fontFamily:C.mono, fontSize:10, color:C.text3, maxWidth:560, textAlign:"right", lineHeight:1.7 }}>
            Trading CFDs and Forex involves significant risk of loss. Past performance is not indicative of future results. PesaPips is a software tool, not a licensed investment advisor.
          </span>
        </div>
      </div>
    </footer>
  )
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeSection, setActiveSection] = useState("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
      },
      { threshold: 0.3 }
    )
    document.querySelectorAll("section[id]").forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${C.bg}; color: ${C.text}; font-family: ${C.sans}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input, textarea, select { box-sizing: border-box; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.75); } }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-mock { display: none !important; }
          .how-grid  { grid-template-columns: 1fr !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .plan-grid { grid-template-columns: 1fr !important; }
          .rev-grid  { grid-template-columns: 1fr !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .contact-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .ea-grid   { grid-template-columns: 1fr !important; gap: 40px !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none !important; }
          section { padding: 60px 20px !important; }
        }
      `}</style>

      <div style={{ position:"sticky", top:0, zIndex:300 }}>
        <Nav activeSection={activeSection} />
        <TickerBar />
      </div>

      <Hero />
      <EADownload />
      <About />
      <HowItWorks />
      <Features />
      <Pricing />
      <Reviews />
      <BlogPreview />
      <Contact />
      <CTABanner />
      <Footer />
    </>
  )
}
