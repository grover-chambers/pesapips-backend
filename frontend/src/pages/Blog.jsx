import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const BASE = "http://localhost:8000"
const C = {
  bg:"#171a20", surface:"#1f2330", surface2:"#262c3a",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)",
  gold:"#d4a843", goldDim:"rgba(212,168,67,0.10)",
  green:"#3dd68c", red:"#f06b6b", blue:"#5b9cf6",
  text:"#edeef0", text2:"#9aa0b0", text3:"#5a6070",
  mono:"'DM Mono',monospace", display:"'DM Serif Display',Georgia,serif",
  sans:"'DM Sans',system-ui,sans-serif",
}

const CATEGORIES = ["All","Strategy","Market Analysis","Education","Broker Review","Trade Journal","General"]
const CAT_COLORS = {
  "Strategy":"#5b9cf6","Market Analysis":"#f5c842","Education":"#3dd68c",
  "Broker Review":"#a78bfa","Trade Journal":"#f06b6b","General":"#9aa0b0"
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function Blog() {
  const navigate    = useNavigate()
  const [posts,     setPosts]    = useState([])
  const [total,     setTotal]    = useState(0)
  const [loading,   setLoading]  = useState(true)
  const [category,  setCategory] = useState("All")
  const [search,    setSearch]   = useState("")
  const [searchVal, setSearchVal]= useState("")
  const [offset,    setOffset]   = useState(0)
  const LIMIT = 9

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset })
    if (category !== "All") params.append("category", category)
    if (search) params.append("search", search)
    axios.get(`${BASE}/blog/published?${params}`)
      .then(r => { setPosts(r.data.posts); setTotal(r.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, search, offset])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchVal)
    setOffset(0)
  }

  const featured = posts.filter(p => p.is_featured)
  const regular  = posts.filter(p => !p.is_featured)

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        a{text-decoration:none;color:inherit}
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, background:`rgba(23,26,32,0.97)`, backdropFilter:"blur(16px)" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:C.gold, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:15, color:"#000" }}>P</div>
          <span style={{ fontFamily:C.display, fontSize:18, color:C.text }}>PesaPips AI</span>
        </a>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <a href="/#features" style={{ fontFamily:C.sans, fontSize:14, color:C.text2 }}>Features</a>
          <a href="/#pricing"  style={{ fontFamily:C.sans, fontSize:14, color:C.text2 }}>Pricing</a>
          <a href="/login"     style={{ fontFamily:C.sans, fontSize:14, color:C.text2 }}>Sign in</a>
          <a href="/register"  style={{ padding:"8px 18px", borderRadius:8, background:C.gold, color:"#000", fontFamily:C.sans, fontSize:14, fontWeight:700 }}>Get started</a>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding:"64px 40px 40px", maxWidth:1100, margin:"0 auto", textAlign:"center" }}>
        <div style={{ fontFamily:C.mono, fontSize:10, color:C.gold, letterSpacing:"0.18em", marginBottom:12 }}>PESAPIPS BLOG</div>
        <h1 style={{ fontFamily:C.display, fontSize:"clamp(32px,4vw,52px)", color:C.text, letterSpacing:"-0.02em", marginBottom:16 }}>
          Trading knowledge for<br/>the serious Kenyan trader
        </h1>
        <p style={{ fontFamily:C.sans, fontSize:16, color:C.text2, maxWidth:520, margin:"0 auto 32px" }}>
          Strategies, market analysis, broker reviews and real trading experience — written by traders who actually use the platform.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10, maxWidth:480, margin:"0 auto" }}>
          <input value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Search articles..."
            style={{ flex:1, padding:"11px 16px", background:C.surface, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.sans, fontSize:14, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.gold}
            onBlur={e=>e.target.style.borderColor=C.border2}
          />
          <button type="submit" style={{ padding:"11px 20px", borderRadius:8, border:"none", background:C.gold, color:"#000", fontFamily:C.mono, fontSize:11, fontWeight:700, cursor:"pointer" }}>Search</button>
        </form>
      </div>

      {/* Category filter */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 40px 32px", display:"flex", gap:8, flexWrap:"wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>{setCategory(c);setOffset(0)}} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${category===c?C.gold:C.border}`, background:category===c?C.goldDim:"transparent", color:category===c?C.gold:C.text3, fontFamily:C.mono, fontSize:10, cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.2s" }}>{c.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 40px 80px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, fontFamily:C.mono, fontSize:12, color:C.text3 }}>Loading articles...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, fontFamily:C.sans, fontSize:14, color:C.text3 }}>No articles found.</div>
        ) : (
          <>
            {/* Featured posts */}
            {featured.length > 0 && offset === 0 && (
              <div style={{ marginBottom:40 }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>FEATURED</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
                  {featured.map(post => <PostCard key={post.id} post={post} featured onClick={()=>navigate(`/blog/${post.slug}`)} />)}
                </div>
              </div>
            )}

            {/* Regular posts */}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && offset === 0 && <div style={{ fontFamily:C.mono, fontSize:9, color:C.text3, letterSpacing:"0.14em", marginBottom:16 }}>ALL ARTICLES</div>}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
                  {regular.map(post => <PostCard key={post.id} post={post} onClick={()=>navigate(`/blog/${post.slug}`)} />)}
                </div>
              </div>
            )}

            {/* Pagination */}
            <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:40 }}>
              {offset > 0 && (
                <button onClick={()=>setOffset(o=>Math.max(0,o-LIMIT))} style={{ padding:"9px 20px", borderRadius:8, border:`1px solid ${C.border2}`, background:"transparent", color:C.text2, fontFamily:C.mono, fontSize:11, cursor:"pointer" }}>← Previous</button>
              )}
              <span style={{ fontFamily:C.mono, fontSize:11, color:C.text3, padding:"9px 16px" }}>{offset+1}-{Math.min(offset+LIMIT,total)} of {total}</span>
              {offset+LIMIT < total && (
                <button onClick={()=>setOffset(o=>o+LIMIT)} style={{ padding:"9px 20px", borderRadius:8, border:`1px solid ${C.border2}`, background:"transparent", color:C.text2, fontFamily:C.mono, fontSize:11, cursor:"pointer" }}>Next →</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:"60px 40px", textAlign:"center" }}>
        <h2 style={{ fontFamily:C.display, fontSize:32, color:C.text, marginBottom:12 }}>Ready to trade smarter?</h2>
        <p style={{ fontFamily:C.sans, fontSize:15, color:C.text2, marginBottom:24 }}>Join traders across Kenya using PesaPips AI.</p>
        <a href="/register" style={{ padding:"13px 32px", borderRadius:10, background:C.gold, color:"#000", fontFamily:C.sans, fontSize:15, fontWeight:700 }}>Start free →</a>
      </div>
    </div>
  )
}

function PostCard({ post, featured, onClick }) {
  const color = CAT_COLORS[post.category] || C.text3
  return (
    <div onClick={onClick} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"24px", cursor:"pointer", transition:"all 0.2s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)"}}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontFamily:C.mono, fontSize:9, color, padding:"3px 8px", background:`${color}15`, border:`1px solid ${color}30`, borderRadius:4, letterSpacing:"0.08em" }}>{post.category.toUpperCase()}</span>
        {featured && <span style={{ fontFamily:C.mono, fontSize:9, color:C.gold }}>★ FEATURED</span>}
      </div>
      <h3 style={{ fontFamily:C.display, fontSize:featured?20:17, color:C.text, marginBottom:10, lineHeight:1.3 }}>{post.title}</h3>
      <p style={{ fontFamily:C.sans, fontSize:13, color:C.text2, lineHeight:1.6, marginBottom:16 }}>{post.excerpt?.slice(0,120)}...</p>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:C.mono, fontSize:10, color:C.text3 }}>By {post.author_name}</span>
        <div style={{ display:"flex", gap:12 }}>
          <span style={{ fontFamily:C.mono, fontSize:10, color:C.text3 }}>👁 {post.views}</span>
          <span style={{ fontFamily:C.mono, fontSize:10, color:C.text3 }}>{post.published_at ? timeAgo(post.published_at) : ""}</span>
        </div>
      </div>
    </div>
  )
}
