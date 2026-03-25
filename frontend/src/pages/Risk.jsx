import { useEffect } from "react"

const C = {
  bg: "#171a20", surface: "#1f2330", border: "rgba(255,255,255,0.07)",
  gold: "#d4a843", red: "#f06b6b", text: "#edeef0", text2: "#9aa0b0", text3: "#5a6070",
  mono: "'DM Mono', monospace", display: "'DM Serif Display', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: C.display, fontSize: 22, color: C.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>{title}</h2>
      <div style={{ fontFamily: C.sans, fontSize: 15, color: C.text2, lineHeight: 1.85 }}>{children}</div>
    </div>
  )
}

export default function Risk() {
  useEffect(() => { window.scrollTo(0,0) }, [])
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 40px", display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, background: C.gold, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#000" }}>P</div>
          <span style={{ fontFamily: C.display, fontSize: 18, color: C.text }}>PesaPips AI</span>
        </a>
        <span style={{ color: C.text3, fontSize: 13, fontFamily: C.sans }}>/ Risk Disclaimer</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 40px" }}>
        {/* Warning banner */}
        <div style={{ background: "rgba(240,107,107,0.08)", border: "1px solid rgba(240,107,107,0.25)", borderRadius: 12, padding: "20px 24px", marginBottom: 48, display: "flex", gap: 16 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>IMPORTANT RISK WARNING</div>
            <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
              Trading Forex, Gold, indices and other financial instruments carries a high level of risk and may not be suitable for all investors. You could lose some or all of your invested capital. Do not trade money you cannot afford to lose.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 12 }}>LEGAL</div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(32px,4vw,48px)", color: C.text, marginBottom: 16, letterSpacing: "-0.02em" }}>Risk Disclaimer</h1>
          <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>Last updated: March 2026</p>
        </div>

        <Section title="1. PesaPips is a Software Tool — Not a Financial Advisor">
          <p>PesaPips AI provides software tools for traders. We are not a licensed financial advisor, investment manager, stockbroker, or regulated financial institution under Kenyan law or the laws of any other jurisdiction.</p>
          <br/>
          <p>Nothing on the PesaPips platform — including AI signals, strategy recommendations, backtest results, market analysis, or any other content — constitutes financial advice, investment advice, or a recommendation to buy or sell any financial instrument.</p>
          <br/>
          <p>Every trading decision is yours alone. You are solely responsible for evaluating the merits and risks of any trade you place, whether manually or through the autorun feature.</p>
        </Section>

        <Section title="2. The Nature of Trading Risk">
          <p>Trading in leveraged financial instruments is inherently risky. The following risks apply to all trading activity, including activity facilitated through PesaPips:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Market risk: Prices can move sharply and unpredictably, including against your position",
              "Leverage risk: Leveraged trading amplifies both profits and losses. A small adverse move can wipe out your entire deposit",
              "Liquidity risk: Some instruments or market conditions may make it difficult to exit a position at the expected price",
              "Gap risk: Markets can open significantly higher or lower than they closed, bypassing your stop loss",
              "Technology risk: Internet outages, broker system failures, or platform errors can prevent timely order execution",
              "Counterparty risk: Your broker may become insolvent or fail to honour your positions",
              "Automated trading risk: The autorun feature executes trades based on algorithmic signals. It is not infallible and can generate losses in adverse market conditions",
            ].map((item, i) => <li key={i} style={{ marginBottom: 10 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="3. Past Performance is Not Indicative of Future Results">
          <p>Backtest results shown on PesaPips are simulations based on historical price data. They are provided for educational and analytical purposes only. Simulated results have inherent limitations:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Backtests are run on historical data that is already known — real trading involves uncertainty",
              "Backtests cannot account for slippage, spread widening, partial fills, or broker-specific execution differences",
              "A strategy that performed well historically may perform poorly in changed market conditions",
              "No backtest result should be interpreted as a guarantee or reliable prediction of future live performance",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="4. Autorun Feature — Specific Risks">
          <p>The autorun feature places real trades with real money in your broker account. By enabling it, you acknowledge:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["You have tested the strategy and understand its risk profile",
              "You have set appropriate risk parameters (lot size, stop loss, take profit)",
              "You will monitor the feature and are responsible for disabling it if market conditions change",
              "PesaPips is not responsible for losses generated by the autorun feature under any circumstances",
              "Automated trading does not guarantee profits and can result in substantial losses",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="5. Suitability">
          <p>Before trading, honestly assess whether trading is appropriate for you given your:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Financial situation and ability to absorb losses",
              "Trading experience and knowledge of financial markets",
              "Risk tolerance and emotional ability to handle losses",
              "Time available to monitor your positions",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <br/>
          <p>If you are unsure whether trading is suitable for you, seek independent financial advice from a licensed professional in your jurisdiction before proceeding.</p>
        </Section>

        <Section title="6. No Guarantee of Accuracy">
          <p>While we work hard to ensure the accuracy of signals and data on PesaPips, we do not warrant that any signal, price data, or information is accurate, complete, or timely. Market data is provided by third-party sources and may contain errors or delays. We are not liable for any trading decision made based on inaccurate or delayed data.</p>
        </Section>

        <Section title="7. Regulatory Notice">
          <p>PesaPips operates as a software provider. We are not regulated by the Capital Markets Authority of Kenya (CMA) or any other financial regulatory body. If you are trading through a regulated broker, that broker's regulatory protections apply to your relationship with them — not to PesaPips.</p>
          <br/>
          <p>Residents of certain jurisdictions may be restricted from using trading platforms or services. It is your responsibility to ensure compliance with the laws of your jurisdiction.</p>
        </Section>

        <Section title="8. Contact">
          <p>For questions about this disclaimer: <a href="mailto:pesapipsai@gmail.com" style={{ color: C.gold }}>pesapipsai@gmail.com</a></p>
        </Section>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "24px 40px", textAlign: "center", fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
        © 2026 PesaPips AI · <a href="/terms" style={{ color: C.text3, textDecoration: "none" }}>Terms of Service</a> · <a href="/privacy" style={{ color: C.text3, textDecoration: "none" }}>Privacy Policy</a>
      </div>
    </div>
  )
}
