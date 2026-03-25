import { useEffect } from "react"

const C = {
  bg: "#171a20", surface: "#1f2330", border: "rgba(255,255,255,0.07)",
  gold: "#d4a843", text: "#edeef0", text2: "#9aa0b0", text3: "#5a6070",
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

export default function Terms() {
  useEffect(() => { window.scrollTo(0,0) }, [])
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 40px", display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, background: C.gold, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#000" }}>P</div>
          <span style={{ fontFamily: C.display, fontSize: 18, color: C.text }}>PesaPips AI</span>
        </a>
        <span style={{ color: C.text3, fontSize: 13, fontFamily: C.sans }}>/ Terms of Service</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 12 }}>LEGAL</div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(32px,4vw,48px)", color: C.text, marginBottom: 16, letterSpacing: "-0.02em" }}>Terms of Service</h1>
          <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>Last updated: March 2026 · Effective immediately upon account creation</p>
        </div>

        <Section title="1. About PesaPips">
          <p>PesaPips AI ("PesaPips", "we", "us") is a software platform that provides trading tools, AI-generated market signals, and automation utilities for use with MetaTrader 5 (MT5) broker accounts. We are registered and operated in Nairobi, Kenya.</p>
          <br/>
          <p><strong style={{ color: C.text }}>PesaPips is a software tool — not a financial advisor, investment manager, or licensed broker.</strong> We do not manage funds, provide personalised investment advice, or guarantee any trading outcomes. Every decision to place a trade remains entirely yours.</p>
        </Section>

        <Section title="2. Acceptance of Terms">
          <p>By creating an account on PesaPips, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, do not use the platform. You must be at least 18 years of age to use PesaPips.</p>
        </Section>

        <Section title="3. What PesaPips Does">
          <p>PesaPips provides:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["AI-generated trade signals based on technical indicator analysis (EMA, RSI, MACD and others)",
              "A strategy backtester that runs simulated trades against historical price data",
              "An Expert Advisor (EA) that connects your MT5 terminal to the PesaPips signal engine",
              "An optional autorun feature that can execute trades automatically based on generated signals",
              "Performance analytics and trade history tracking",
              "Educational content about trading concepts and market structure",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <br/>
          <p>All signals and backtests are generated algorithmically. They are not personalised financial advice. Past backtest performance does not guarantee future live results.</p>
        </Section>

        <Section title="4. Risk Acknowledgement">
          <p>Trading financial instruments including foreign exchange (Forex), commodities (Gold, Oil), indices and cryptocurrencies involves substantial risk of loss. You acknowledge and accept that:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["You may lose some or all of the capital you deposit with your broker",
              "Automated trading does not eliminate risk — it executes a strategy, not a guarantee",
              "Market conditions can change rapidly and unpredictably, including during news events, weekends and market open gaps",
              "The autorun feature places real trades with real money when enabled — you are responsible for monitoring it",
              "PesaPips bears no responsibility for losses incurred through use of the platform",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <br/>
          <p><strong style={{ color: C.text }}>Only trade with money you can afford to lose.</strong></p>
        </Section>

        <Section title="5. Your Account & Credentials">
          <p>You are responsible for maintaining the security of your PesaPips login credentials. Your MT5 broker password is encrypted using AES-256 symmetric encryption before being stored. However, you acknowledge that no system is completely secure and you use the platform at your own risk.</p>
          <br/>
          <p>You must not share your account with others or use PesaPips to manage third-party funds without appropriate licensing from the relevant financial regulator.</p>
        </Section>

        <Section title="6. Subscriptions & Billing">
          <p>PesaPips offers a free tier and paid subscription plans billed in Kenyan Shillings (KES). Paid plans are billed monthly. You may cancel at any time — your access continues until the end of the current billing period. We do not offer refunds for partial months.</p>
          <br/>
          <p>We reserve the right to change pricing with 30 days' notice to existing subscribers.</p>
        </Section>

        <Section title="7. Prohibited Uses">
          <p>You may not use PesaPips to:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Manage third-party funds without appropriate regulatory authorisation",
              "Engage in market manipulation or any activity that violates your broker's terms",
              "Attempt to reverse-engineer, copy or resell the PesaPips software or signal engine",
              "Use the platform in any jurisdiction where such use is prohibited by law",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the maximum extent permitted by Kenyan law, PesaPips and its directors, employees and agents shall not be liable for any trading losses, loss of profits, loss of data, or any indirect, incidental or consequential damages arising from your use of the platform — regardless of whether we were advised of the possibility of such damages.</p>
          <br/>
          <p>Our total aggregate liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.</p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>We may update these Terms from time to time. When we do, we will update the date at the top of this page and notify you by email if the changes are material. Continued use of PesaPips after changes constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="10. Governing Law">
          <p>These Terms are governed by the laws of Kenya. Any disputes shall be subject to the exclusive jurisdiction of the courts of Nairobi, Kenya.</p>
        </Section>

        <Section title="11. Contact">
          <p>For questions about these Terms, contact us at <a href="mailto:pesapipsai@gmail.com" style={{ color: C.gold }}>pesapipsai@gmail.com</a> or through the contact form on our website.</p>
        </Section>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "24px 40px", textAlign: "center", fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
        © 2026 PesaPips AI · <a href="/privacy" style={{ color: C.text3, textDecoration: "none" }}>Privacy Policy</a> · <a href="/risk" style={{ color: C.text3, textDecoration: "none" }}>Risk Disclaimer</a>
      </div>
    </div>
  )
}
