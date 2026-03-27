import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import SocialShare from "../components/SocialShare"

const BASE = "https://pesapips-backend.onrender.com"
const C = {
  bg:"#171a20", surface:"#1f2330", surface2:"#262c3a",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)",
  gold:"#d4a843", goldDim:"rgba(212,168,67,0.10)",
  green:"#3dd68c", text:"#edeef0", text2:"#9aa0b0", text3:"#5a6070",
  mono:"'DM Mono',monospace", display:"'DM Serif Display',Georgia,serif",
  sans:"'DM Sans',system-ui,sans-serif",
}

function renderMarkdown(md) {
  if (!md) return ""
  let html = md
    .replace(/^## (.+)$/gm, '<h2 style="font-family:\'DM Serif Display\',Georgia,serif;font-size:24px;color:#edeef0;margin:32px 0 12px;letter-spacing:-0.01em">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'DM Sans\',sans-serif;font-size:18px;font-weight:600;color:#edeef0;margin:24px 0 10px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#edeef0;font-weight:700">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#d4a843;text-decoration:underline">$1</a>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:12px;margin-bottom:10px"><span style="font-family:monospace;font-size:12px;color:#d4a843;min-width:20px;margin-top:2px">$1.</span><span>$2</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:#d4a843;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '</p><p style="font-family:\'DM Sans\',sans-serif;font-size:16px;color:#9aa0b0;line-height:1.85;margin-bottom:16px">')
  return `<p style="font-family:'DM Sans',sans-serif;font-size:16px;color:#9aa0b0;line-height:1.85;margin-bottom:16px">${html}</p>`
}

export default function BlogPost() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  useEffect(() => {
    axios.get(`${BASE}/blog/published/${slug}`)
      .then(r => setPost(r.data))
      .catch(() => setError("Article not found"))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontFamily:C.mono, fontSize:12, color:C.text3 }}>Loading...</span>
    </div>
  )

  if (error || !post) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <span style={{ fontFamily:C.display, fontSize:28, color:C.text }}>Article not found</span>
      <button onClick={()=>navigate("/blog")} style={{ padding:"10px 24px", borderRadius:8, border:`1px solid ${C.border2}`, background:"transparent", color:C.text2, fontFamily:C.mono, fontSize:12, cursor:"pointer" }}>← Back to blog</button>
    </div>
  )

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, background:`rgba(23,26,32,0.97)`, backdropFilter:"blur(16px)" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:C.gold, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:15, color:"#000" }}>P</div>
          <span style={{ fontFamily:C.display, fontSize:18, color:C.text }}>PesaPips AI</span>
        </a>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <button onClick={()=>navigate("/blog")} style={{ background:"none", border:"none", fontFamily:C.sans, fontSize:14, color:C.text2, cursor:"pointer" }}>← Blog</button>
          <a href="/register" style={{ padding:"8px 18px", borderRadius:8, background:C.gold, color:"#000", fontFamily:C.sans, fontSize:14, fontWeight:700 }}>Get started</a>
        </div>
      </div>

      {/* Article */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"60px 40px" }}>
        {/* Meta */}
        <div style={{ marginBottom:32 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
            <span style={{ fontFamily:C.mono, fontSize:9, color:C.gold, padding:"3px 10px", background:C.goldDim, border:`1px solid ${C.gold}30`, borderRadius:4, letterSpacing:"0.08em" }}>{post.category?.toUpperCase()}</span>
            {post.is_featured && <span style={{ fontFamily:C.mono, fontSize:9, color:C.gold }}>★ FEATURED</span>}
          </div>
          <h1 style={{ fontFamily:C.display, fontSize:"clamp(26px,4vw,40px)", color:C.text, lineHeight:1.2, letterSpacing:"-0.02em", marginBottom:20 }}>{post.title}</h1>
          <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.text3 }}>By {post.author_name}</span>
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.text3 }}>
              {post.published_at ? new Date(post.published_at).toLocaleDateString("en-KE", {year:"numeric",month:"long",day:"numeric"}) : ""}
            </span>
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.text3 }}>👁 {post.views} views</span>
          </div>
        </div>

        {/* Excerpt */}
        <div style={{ padding:"16px 20px", background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.gold}`, borderRadius:"0 8px 8px 0", marginBottom:32 }}>
          <p style={{ fontFamily:C.sans, fontSize:15, color:C.text2, lineHeight:1.7, fontStyle:"italic" }}>{post.excerpt}</p>
        </div>

        {/* Content */}
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        {/* Social Share */}
        <SocialShare title={post.title} url={window.location.href} />


        {/* CTA */}
        <div style={{ marginTop:48, padding:"32px", background:C.goldDim, border:`1px solid ${C.gold}30`, borderRadius:14, textAlign:"center" }}>
          <div style={{ fontFamily:C.display, fontSize:22, color:C.text, marginBottom:8 }}>Try PesaPips Free</div>
          <p style={{ fontFamily:C.sans, fontSize:14, color:C.text2, marginBottom:20 }}>Automate your trading strategy on MT5. No credit card needed.</p>
          <a href="/register" style={{ padding:"12px 28px", borderRadius:8, background:C.gold, color:"#000", fontFamily:C.sans, fontSize:14, fontWeight:700 }}>Start free →</a>
        </div>

        {/* Back */}
        <div style={{ marginTop:32, textAlign:"center" }}>
          <button onClick={()=>navigate("/blog")} style={{ background:"none", border:`1px solid ${C.border2}`, borderRadius:8, padding:"10px 20px", color:C.text2, fontFamily:C.mono, fontSize:11, cursor:"pointer" }}>← Back to all articles</button>
        </div>
      </div>
    </div>
  )
}
