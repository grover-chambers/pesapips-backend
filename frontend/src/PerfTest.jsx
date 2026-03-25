import React from 'react'
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
      <SectionHeader title="Performance" sub="Analyse your strategies — backtest results vs live market performance." />

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
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
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
                        {r.total_pnl >= 0 ? "+" : ""}{r.total_pnl}
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
                        <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default Performance
