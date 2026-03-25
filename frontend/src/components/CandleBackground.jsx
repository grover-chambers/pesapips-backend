import { useEffect, useRef } from "react"

export default function CandleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animId, offset = 0, timer = 0

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    let price = 4500
    const candles = Array.from({ length: 100 }, () => {
      const open  = price
      const move  = (Math.random() - 0.48) * 14
      const close = open + move
      price = close
      return {
        open, close,
        high: Math.max(open, close) + Math.random() * 8,
        low:  Math.min(open, close) - Math.random() * 8,
      }
    })

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Deep dark background
      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, "#07080d")
      bg.addColorStop(0.5, "#0a0c14")
      bg.addColorStop(1, "#080a10")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.02)"
      ctx.lineWidth = 1
      for (let i = 0; i <= 12; i++) {
        ctx.beginPath(); ctx.moveTo(0, H*i/12); ctx.lineTo(W, H*i/12); ctx.stroke()
      }
      for (let i = 0; i <= 20; i++) {
        ctx.beginPath(); ctx.moveTo(W*i/20, 0); ctx.lineTo(W*i/20, H); ctx.stroke()
      }

      const cw  = Math.max(Math.floor(W / 45), 8)
      const gap = Math.floor(cw * 0.3)
      const bw  = cw - gap
      const vis = Math.ceil(W / cw) + 2
      const st  = Math.max(0, candles.length - vis - Math.floor(offset))
      const sl  = candles.slice(st)

      if (sl.length === 0) { animId = requestAnimationFrame(draw); return }

      const prices = sl.flatMap(c => [c.high, c.low])
      const minP   = Math.min(...prices) - 30
      const maxP   = Math.max(...prices) + 30
      const sy     = p => H * 0.08 + (1 - (p - minP) / (maxP - minP)) * H * 0.76

      // Draw EMA line
      ctx.beginPath()
      ctx.strokeStyle = "rgba(245,200,66,0.2)"
      ctx.lineWidth = 1.5
      sl.forEach((_, i) => {
        const emaSlice = sl.slice(Math.max(0, i - 21), i + 1)
        const avg = emaSlice.reduce((s, c) => s + c.close, 0) / emaSlice.length
        const x   = i * cw - (offset % 1) * cw + gap / 2 + bw / 2
        i === 0 ? ctx.moveTo(x, sy(avg)) : ctx.lineTo(x, sy(avg))
      })
      ctx.stroke()

      // Draw candles
      sl.forEach((c, i) => {
        const x    = i * cw - (offset % 1) * cw + gap / 2
        const bull = c.close >= c.open
        const col  = bull ? "rgba(61,214,140,0.55)"  : "rgba(240,107,107,0.55)"
        const fill = bull ? "rgba(61,214,140,0.08)" : "rgba(240,107,107,0.08)"

        ctx.strokeStyle = col
        ctx.lineWidth   = 1
        ctx.beginPath()
        ctx.moveTo(x + bw/2, sy(c.high))
        ctx.lineTo(x + bw/2, sy(c.low))
        ctx.stroke()

        const yt = Math.min(sy(c.open), sy(c.close))
        const yh = Math.max(Math.abs(sy(c.close) - sy(c.open)), 1)
        ctx.fillStyle = fill
        ctx.fillRect(x, yt, bw, yh)
        ctx.strokeStyle = col
        ctx.strokeRect(x, yt, bw, yh)
      })

      // Strong vignette to keep edges dark
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.05, W/2, H/2, H*0.85)
      vig.addColorStop(0, "rgba(8,9,15,0.3)")
      vig.addColorStop(0.6, "rgba(8,9,15,0.6)")
      vig.addColorStop(1, "rgba(8,9,15,0.92)")
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // Advance animation
      timer++
      if (timer > 90) {
        const last  = candles[candles.length - 1]
        const open  = last.close
        const move  = (Math.random() - 0.48) * 14
        const close = open + move
        candles.push({ open, close, high: Math.max(open,close)+Math.random()*8, low: Math.min(open,close)-Math.random()*8 })
        candles.shift()
        timer = 0
      }
      offset += 0.012
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  )
}
