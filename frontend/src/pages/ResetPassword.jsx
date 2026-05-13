import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"

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

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token. Check your email for the correct link.")
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (password !== confirm) { setError("Passwords do not match"); return }
    setLoading(true)
    try {
      await api.post("/auth/reset-password", null, { params: { token, new_password: password } })
      setDone(true)
      setTimeout(() => navigate("/login"), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed. The link may have expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, maxWidth: "90vw" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontFamily: C.display, fontSize: 24, color: C.text }}>PesaPips</span>
          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.gold, marginLeft: 8, letterSpacing: "0.15em" }}>AI</span>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <h2 style={{ fontFamily: C.display, fontSize: 22, color: C.green, marginBottom: 12 }}>Password Reset</h2>
              <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
                Your password has been updated. Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: C.display, fontSize: 22, color: C.text, marginBottom: 8 }}>Set New Password</h2>
              <p style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, marginBottom: 24 }}>
                Enter your new password below.
              </p>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>NEW PASSWORD</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    style={{ width: "100%", padding: "11px 14px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, fontFamily: C.sans, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>CONFIRM PASSWORD</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    style={{ width: "100%", padding: "11px 14px", background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, fontFamily: C.sans, fontSize: 14, outline: "none" }} />
                </div>
                {error && <div style={{ fontFamily: C.sans, fontSize: 13, color: C.red, marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading || !token}
                  style={{ width: "100%", padding: "12px", background: loading || !token ? C.surface2 : C.gold, color: loading || !token ? C.text3 : "#000", border: "none", borderRadius: 8, fontFamily: C.sans, fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer" }}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/login" style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, textDecoration: "none" }}>← Back to login</a>
        </div>
      </div>
    </div>
  )
}
