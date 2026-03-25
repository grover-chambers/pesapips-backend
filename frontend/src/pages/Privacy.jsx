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

export default function Privacy() {
  useEffect(() => { window.scrollTo(0,0) }, [])
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 40px", display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, background: C.gold, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#000" }}>P</div>
          <span style={{ fontFamily: C.display, fontSize: 18, color: C.text }}>PesaPips AI</span>
        </a>
        <span style={{ color: C.text3, fontSize: 13, fontFamily: C.sans }}>/ Privacy Policy</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, letterSpacing: "0.15em", marginBottom: 12 }}>LEGAL</div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(32px,4vw,48px)", color: C.text, marginBottom: 16, letterSpacing: "-0.02em" }}>Privacy Policy</h1>
          <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text3 }}>Last updated: March 2026 · Compliant with Kenya Data Protection Act 2019</p>
        </div>

        <Section title="1. Who We Are">
          <p>PesaPips AI is a trading software platform operated from Nairobi, Kenya. This Privacy Policy explains how we collect, use, store and protect your personal data when you use our platform. We take your privacy seriously — we collect only what we need and never sell your data.</p>
        </Section>

        <Section title="2. Data We Collect">
          <p><strong style={{ color: C.text }}>Account data:</strong> Your email address and hashed password when you register.</p>
          <br/>
          <p><strong style={{ color: C.text }}>MT5 broker credentials:</strong> Your MT5 account number, server name, broker name, and MT5 password. Your password is encrypted using AES-256 symmetric encryption before storage. The encryption key is stored separately from the database. We do not store your password in plain text at any point.</p>
          <br/>
          <p><strong style={{ color: C.text }}>Trading data:</strong> Trade history, strategy configurations, backtest results, and performance logs associated with your account.</p>
          <br/>
          <p><strong style={{ color: C.text }}>Usage data:</strong> Pages visited, features used, and actions taken within the platform — used to improve the product.</p>
          <br/>
          <p><strong style={{ color: C.text }}>Communications:</strong> Messages you send us through the contact form or support system.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul style={{ paddingLeft: 24 }}>
            {["To operate your account and provide the PesaPips service",
              "To connect to your MT5 broker and execute the trading functions you have enabled",
              "To send you important account notices, security alerts, and service updates",
              "To improve the platform based on how it is used",
              "To comply with legal obligations under Kenyan law",
            ].map((item, i) => <li key={i} style={{ marginBottom: 10 }}>{item}</li>)}
          </ul>
          <br/>
          <p>We do not use your data for advertising. We do not sell your data to third parties. Ever.</p>
        </Section>

        <Section title="4. MT5 Credential Security">
          <p>We understand that your broker credentials are sensitive. Here is exactly how we protect them:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Your MT5 password is encrypted with Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256) at the point of entry",
              "The encryption key is stored in a separate environment variable, not in the database",
              "Even if our database were compromised, your password would be unreadable without the key",
              "We never log, display or transmit your MT5 password in plain text",
              "You can delete your MT5 account from PesaPips at any time, which permanently removes the encrypted credential",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="5. Data Sharing">
          <p>We share your data with:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Your MT5 broker — only the credentials you provide, only to execute your trading instructions",
              "Our infrastructure providers (hosting, database) — under strict data processing agreements",
              "Law enforcement or regulators — only when required by law",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <br/>
          <p>We do not share your data with advertisers, data brokers, or any third party for commercial purposes.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your account data for as long as your account is active. If you delete your account, we permanently delete your personal data within 30 days, except where we are required by law to retain certain records.</p>
        </Section>

        <Section title="7. Your Rights (Kenya Data Protection Act 2019)">
          <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
          <ul style={{ paddingLeft: 24, marginTop: 12 }}>
            {["Access the personal data we hold about you",
              "Correct inaccurate data",
              "Request deletion of your data",
              "Object to processing of your data",
              "Lodge a complaint with the Office of the Data Protection Commissioner",
            ].map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <br/>
          <p>To exercise any of these rights, contact us at <a href="mailto:pesapipsai@gmail.com" style={{ color: C.gold }}>pesapipsai@gmail.com</a>.</p>
        </Section>

        <Section title="8. Cookies">
          <p>PesaPips uses only essential cookies required to keep you logged in (a session token stored in localStorage). We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy when our practices change. We will notify you by email and update the date at the top of this page. Continued use of PesaPips after changes constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact">
          <p>For privacy questions or data requests: <a href="mailto:pesapipsai@gmail.com" style={{ color: C.gold }}>pesapipsai@gmail.com</a></p>
        </Section>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "24px 40px", textAlign: "center", fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
        © 2026 PesaPips AI · <a href="/terms" style={{ color: C.text3, textDecoration: "none" }}>Terms of Service</a> · <a href="/risk" style={{ color: C.text3, textDecoration: "none" }}>Risk Disclaimer</a>
      </div>
    </div>
  )
}
