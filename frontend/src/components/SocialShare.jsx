import { useState } from 'react'

const C = {
  gold: "#d4a843",
  goldDim: "rgba(212,168,67,0.10)",
  text: "#edeef0",
  text2: "#9aa0b0",
  border: "rgba(255,255,255,0.07)",
  mono: "'DM Mono',monospace",
}

export default function SocialShare({ title, url }) {
  const [copied, setCopied] = useState(false)
  
  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div style={{ 
      display: "flex", 
      gap: "12px", 
      alignItems: "center",
      padding: "16px 0",
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      margin: "24px 0"
    }}>
      <span style={{ 
        fontFamily: C.mono, 
        fontSize: "10px", 
        color: C.text2,
        letterSpacing: "0.08em"
      }}>
        SHARE THIS ARTICLE →
      </span>
      
      {/* Twitter/X */}
      <a 
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          fontSize: "12px",
          color: C.text2,
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#000"
          e.currentTarget.style.borderColor = "#1DA1F2"
          e.currentTarget.style.color = "#1DA1F2"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(0,0,0,0.3)"
          e.currentTarget.style.borderColor = C.border
          e.currentTarget.style.color = C.text2
        }}
      >
        <span>𝕏</span> <span style={{ fontSize: "11px" }}>X</span>
      </a>
      
      {/* Facebook */}
      <a 
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          fontSize: "12px",
          color: C.text2,
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#1877F2"
          e.currentTarget.style.borderColor = "#1877F2"
          e.currentTarget.style.color = "#fff"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(0,0,0,0.3)"
          e.currentTarget.style.borderColor = C.border
          e.currentTarget.style.color = C.text2
        }}
      >
        <span>f</span> <span style={{ fontSize: "11px" }}>Facebook</span>
      </a>
      
      {/* LinkedIn */}
      <a 
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          fontSize: "12px",
          color: C.text2,
          textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#0A66C2"
          e.currentTarget.style.borderColor = "#0A66C2"
          e.currentTarget.style.color = "#fff"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(0,0,0,0.3)"
          e.currentTarget.style.borderColor = C.border
          e.currentTarget.style.color = C.text2
        }}
      >
        <span>in</span> <span style={{ fontSize: "11px" }}>LinkedIn</span>
      </a>
      
      {/* Copy Link */}
      <button
        onClick={copyToClipboard}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          fontSize: "12px",
          color: copied ? C.gold : C.text2,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          if (!copied) e.currentTarget.style.borderColor = C.gold
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = C.border
        }}
      >
        <span>🔗</span> 
        <span style={{ fontSize: "11px" }}>{copied ? "Copied!" : "Copy link"}</span>
      </button>
    </div>
  )
}
