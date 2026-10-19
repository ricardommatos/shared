"""Generates isometric + flat SVG for the MPC Sample manual and fills the HTML template."""
import math, sys

W, D = 340, 360

def btn(x, y, w, h, fill, label, sub="", txt="#f2f2f2", size=4.0):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2.2" fill="{fill}"/>'
    s += f'<rect x="{x}" y="{y+h-1.6}" width="{w}" height="1.6" rx="0.8" fill="#000" opacity=".25"/>'
    s += f'<text x="{x+w/2}" y="{y+h/2+1.5}" font-size="{size}" fill="{txt}" text-anchor="middle" class="dl">{label}</text>'
    if sub:
        s += f'<text x="{x+w/2}" y="{y+h+4.6}" font-size="3.3" fill="#6d6b66" text-anchor="middle" class="dl">{sub}</text>'
    return s

def knob(cx, cy, r, label=""):
    s = f'<circle cx="{cx+1.6}" cy="{cy+2.4}" r="{r+1.5}" fill="#000" opacity=".22"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r+1.5}" fill="#2b2b2b"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#dcdbd7"/>'
    s += f'<circle cx="{cx-r*0.25}" cy="{cy-r*0.3}" r="{r*0.55}" fill="#f4f4f2" opacity=".8"/>'
    s += f'<line x1="{cx}" y1="{cy}" x2="{cx+r*0.55}" y2="{cy-r*0.75}" stroke="#333" stroke-width="1.4" stroke-linecap="round"/>'
    if label:
        s += f'<text x="{cx}" y="{cy+r+6}" font-size="3.6" fill="#6d6b66" text-anchor="middle" class="dl">{label}</text>'
    return s

def device_top(pid):
    g = []
    g.append(f'<defs><pattern id="{pid}-gr" width="3.6" height="3.6" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="0.95" fill="#3a3a3a"/></pattern></defs>')
    g.append(f'<rect x="0" y="0" width="{W}" height="{D}" rx="5" fill="#E3E1DC"/>')
    g.append('<path d="M5 0 H335 A5 5 0 0 1 340 5 V105 H0 V5 A5 5 0 0 1 5 0Z" fill="#151515"/>')
    # logo
    g.append('<text x="16" y="26" font-size="15" font-weight="900" font-style="italic" fill="#D3221C" class="dd">AKAI</text>')
    g.append('<text x="17" y="33" font-size="4.6" font-style="italic" fill="#D3221C" class="dl">professional</text>')
    g.append(knob(46, 66, 15))
    g.append('<text x="46" y="96" font-size="3.6" fill="#8c8a85" text-anchor="middle" class="dl">MAIN VOLUME</text>')
    for i, x in enumerate((108, 140, 172)):
        g.append(f'<rect x="{x}" y="9" width="26" height="9" rx="2" fill="#2f2f2f"/>')
    # screen
    g.append('<rect x="103" y="23" width="98" height="72" rx="3" fill="#2a2a2a"/>')
    g.append('<rect x="106" y="26" width="92" height="66" rx="2" fill="#0B0C16"/>')
    g.append('<rect x="109" y="29" width="22" height="6" rx="1" fill="#2C3A7A"/>')
    g.append('<text x="120" y="33.6" font-size="3.6" fill="#fff" text-anchor="middle" class="dl">BPM 92</text>')
    g.append('<text x="110" y="45" font-size="5.6" fill="#F5C33B" class="dl">Seq A01</text>')
    g.append('<text x="110" y="54" font-size="5" fill="#F5C33B" class="dl">4/4</text>')
    g.append('<text x="140" y="54" font-size="5" fill="#fff" class="dl">001.01</text>')
    g.append('<text x="110" y="70" font-size="4" fill="#9ea3c7" class="dl">4 Bars   Q1/16</text>')
    g.append('<rect x="110" y="76" width="84" height="3" rx="1.5" fill="#1f2340"/>')
    g.append('<rect x="110" y="76" width="31" height="3" rx="1.5" fill="#4BE38A"/>')
    g.append('<circle cx="190" cy="44" r="3" fill="#E5322B"/>')
    # meters
    cols = ["#3BD16F", "#3BD16F", "#3BD16F", "#F5C33B", "#F08A2B", "#E5322B"]
    for cx in (211, 221):
        for i, c in enumerate(cols):
            g.append(f'<rect x="{cx}" y="{82-i*9}" width="6" height="6" rx="1" fill="{c}" opacity="{1 if i < 4 else .45}"/>')
    # speaker
    g.append(f'<rect x="236" y="12" width="92" height="84" rx="4" fill="#0d0d0d"/>')
    g.append(f'<rect x="240" y="16" width="84" height="76" rx="3" fill="url(#{pid}-gr)"/>')
    # left column
    g.append(btn(16, 114, 30, 13, "#2d2d2d", "SAMPLE", "INPUT CONFIG"))
    g.append(btn(52, 114, 30, 13, "#2d2d2d", "SEQ", "STEP EDIT"))
    g.append(btn(16, 140, 30, 13, "#E8592A", "PAD FX", "FLEX BEAT"))
    g.append(btn(52, 140, 30, 13, "#E8592A", "KNOB FX", "FX SELECT"))
    g.append(btn(52, 166, 30, 13, "#2d2d2d", "PAD BANK"))
    g.append(btn(16, 190, 40, 14, "#2d2d2d", "SHIFT", size=4.6))
    g.append('<rect x="37" y="214" width="10" height="74" rx="2" fill="#cfcdc8"/>')
    g.append('<rect x="40" y="218" width="4" height="66" rx="2" fill="#1a1a1a"/>')
    g.append('<rect x="31" y="243" width="22" height="13" rx="2" fill="#000" opacity=".2"/>')
    g.append('<rect x="30" y="240" width="22" height="13" rx="2" fill="#f2f2f0" stroke="#a9a7a2" stroke-width=".6"/>')
    g.append('<line x1="31" y1="246.5" x2="51" y2="246.5" stroke="#9a9893" stroke-width=".8"/>')
    g.append('<rect x="60" y="244" width="6" height="3" rx="1" fill="#ffffff"/>')
    g.append(btn(16, 298, 30, 13, "#2d2d2d", "ERASE", "COPY"))
    g.append(btn(52, 298, 30, 13, "#2d2d2d", "NOTE REPEAT", "TRIPLET", size=3.3))
    # knobs
    for i, x in enumerate((122, 170, 218)):
        g.append(knob(x, 122, 10, f"K{i+1}"))
    # pads
    x0, y0, s, gap = 96, 146, 36, 5
    for r in range(4):
        for c in range(4):
            x, y = x0 + c*(s+gap), y0 + r*(s+gap)
            num = (3-r)*4 + c + 1
            glow = "#4BE38A" if num == 1 else "#D6F26A"
            g.append(f'<rect x="{x+1.4}" y="{y+2.2}" width="{s}" height="{s}" rx="3" fill="#000" opacity=".18"/>')
            g.append(f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="3" fill="{glow}" opacity=".85"/>')
            g.append(f'<rect x="{x+1.6}" y="{y+1.6}" width="{s-3.2}" height="{s-3.2}" rx="2.4" fill="{"#7bd9a0" if num == 1 else "#ABAAA5"}"/>')
    for i, t in enumerate(("FULL LEVEL", "HALF SEQ", "DOUBLE SEQ", "COUNT-IN")):
        g.append(f'<text x="{x0 + i*(s+gap) + s/2}" y="{y0 + 4*(s+gap) + 2}" font-size="3.3" fill="#6d6b66" text-anchor="middle" class="dl">{t}</text>')
    # right column
    g.append('<text x="263" y="110" font-size="3.3" fill="#6d6b66" class="dl">PAD PLAY</text>')
    g.append(btn(262, 113, 32, 12, "#2F7FD1", "CHOP", "NOTE ON"))
    g.append(btn(298, 113, 32, 12, "#2F7FD1", "MUTE", "UNMUTE ALL"))
    g.append(btn(262, 135, 32, 12, "#2F7FD1", "LOOP", "REVERSE"))
    g.append(btn(298, 135, 32, 12, "#2F7FD1", "16 LEVELS", "TYPE", size=3.6))
    g.append(btn(262, 157, 32, 12, "#2d2d2d", "SMP SELECT", "SAVE SAMPLE", size=3.4))
    g.append(btn(298, 157, 32, 12, "#2d2d2d", "TAP TEMPO", "METRO", size=3.4))
    g.append(knob(296, 196, 15))
    g.append(btn(262, 220, 32, 12, "#2d2d2d", "−", "UNDO", size=6))
    g.append(btn(298, 220, 32, 12, "#2d2d2d", "+", "REDO", size=6))
    g.append(btn(262, 243, 32, 13, "#2d2d2d", "SEQ REC", "RECALL", txt="#ff6b5e", size=3.6))
    g.append(btn(298, 243, 32, 13, "#2d2d2d", "SMP REC", "RECALL", txt="#ff6b5e", size=3.6))
    g.append(btn(262, 267, 32, 14, "#2d2d2d", "■", "", size=6))
    g.append(btn(298, 267, 32, 14, "#2d2d2d", "▶", "CONTINUE", txt="#4BE38A", size=6))
    # wrist rest
    g.append('<rect x="94" y="320" width="238" height="32" rx="6" fill="#5c5b58"/>')
    g.append('<text x="318" y="342" font-size="11" font-style="italic" font-weight="800" fill="#807f7a" text-anchor="end" class="dd">MPC SAMPLE</text>')
    return "".join(g)

# ---- isometric helpers
def P(x, y, z):
    return (0.8660 * (x - y), 0.5 * (x + y) - z)

BOUNDS = []

def fit(pad=8):
    xs = [p[0] for p in BOUNDS]; ys = [p[1] for p in BOUNDS]
    x0, y0, x1, y1 = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
    BOUNDS.clear()
    return f"{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}"

def poly(pts, cls=None, fill=None, extra=""):
    BOUNDS.extend(pts)
    d = " ".join(f"{a:.1f},{b:.1f}" for a, b in pts)
    attr = f'class="{cls}"' if cls else f'fill="{fill}"'
    return f'<polygon points="{d}" {attr} {extra}/>'

def device_iso():
    hb, hf = 62, 24
    b = (hb - hf) / D
    # top-plane affine: X = .866x - .866y ; Y = .5x + (.5+b)y - hb
    ox, oy = 322, 78
    out = []
    # ground shadow
    sh = [P(-6, -6, 0), P(W + 26, -6, 0), P(W + 26, D + 30, 0), P(-6, D + 30, 0)]
    sh = [(x + ox + 10, y + oy + 6) for x, y in sh]
    out.append(poly(sh, fill="#000", extra='opacity=".10" filter="url(#soft)"'))
    def zt(y): return hb - b * y
    front = [P(0, D, zt(D)), P(W, D, zt(D)), P(W, D, 0), P(0, D, 0)]
    right = [P(W, 0, zt(0)), P(W, D, zt(D)), P(W, D, 0), P(W, 0, 0)]
    tr = lambda pts: [(x + ox, y + oy) for x, y in pts]
    out.append(poly(tr(right), fill="#A9A7A1"))
    out.append(poly(tr(front), fill="#CBC9C3"))
    # ports on the right side (decorative): headphone + usb-c
    for (yy, zz, rw) in ((60, 30, 3.2), (90, 30, 3.2)):
        pts = [P(W, yy + rw * math.cos(t), zz + rw * math.sin(t)) for t in [i / 12 * 2 * math.pi for i in range(12)]]
        out.append(poly(tr(pts), fill="#2a2a2a"))
    out.append(f'<g transform="matrix(0.866,0.5,-0.866,{0.5 + b:.4f},{ox},{oy - hb})">{device_top("iso")}</g>')
    # highlight edge
    a1, a2 = tr([P(0, D, zt(D)), P(W, D, zt(D))])
    out.append(f'<line x1="{a1[0]:.1f}" y1="{a1[1]:.1f}" x2="{a2[0]:.1f}" y2="{a2[1]:.1f}" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>')
    defs = '<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter></defs>'
    return f'<svg viewBox="0 0 650 460" role="img" aria-label="Ilustração isométrica do Akai MPC Sample" class="iso-device">{defs}{"".join(out)}</svg>'

def device_flat():
    return f'<svg viewBox="-6 -6 352 372" class="flat-device" role="img" aria-label="Painel superior do MPC Sample"><g>{device_top("flat")}</g><g class="hotspots"></g></svg>'

# ---- small theme-aware isometric icons
def box(x, y, z, w, d, h, top="t", left="l", right="r"):
    T = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
    L = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]
    R = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]
    return poly(R, cls=right) + poly(L, cls=left) + poly(T, cls=top)

def disc(cx, cy, z, r, cls, n=40):
    return poly([P(cx + r * math.cos(t), cy + r * math.sin(t), z) for t in [i / n * 2 * math.pi for i in range(n)]], cls=cls)

def front_disc(cx, yface, cz, r, cls, n=36):
    return poly([P(cx + r * math.cos(t), yface, cz + r * math.sin(t)) for t in [i / n * 2 * math.pi for i in range(n)]], cls=cls)

def icon(body, vb=None):
    return f'<svg viewBox="{fit(10)}" class="iso-icon" aria-hidden="true">{body}</svg>'

def icons():
    BOUNDS.clear()
    ic = {}
    # laptop with code
    s = box(-30, -22, 0, 60, 44, 3)
    s += box(-30, -25, 3, 60, 3, 40, top="t", left="scr", right="r")
    for i, (x0, ln, c) in enumerate(((-24, 22, "a1"), (-20, 30, "a2"), (-20, 16, "a3"), (-24, 10, "a1"))):
        z = 34 - i * 7
        s += f'<polyline points="{" ".join(f"{a:.1f},{bb:.1f}" for a, bb in (P(x0, -22, z), P(x0 + ln, -22, z)))}" class="ln {c}"/>'
    ic["laptop"] = icon(s)
    # turntable
    s = box(-32, -32, 0, 64, 64, 9)
    s += disc(-4, -2, 9.2, 24, "blk")
    s += disc(-4, -2, 9.4, 17, "groove")
    s += disc(-4, -2, 9.6, 7, "a1f")
    s += box(20, -26, 9, 4, 30, 3, top="t", left="l", right="r")
    ic["vinyl"] = icon(s)
    # phone
    s = box(-14, -26, 0, 28, 52, 4, top="scrtop")
    s += disc(0, 0, 4.2, 9, "a2f", n=30)
    s += disc(0, 0, 4.4, 4, "t", n=20)
    ic["phone"] = icon(s)
    # speaker cube
    s = box(-24, -24, 0, 48, 48, 48)
    s += front_disc(0, 24, 22, 15, "blk")
    s += front_disc(0, 24, 22, 7, "a3f")
    s += front_disc(0, 24, 40, 4, "blk")
    ic["speaker"] = icon(s, "-70 -80 140 130")
    # pencil + ruler
    s = box(-34, -10, 0, 70, 18, 3, top="a2f")
    for k in range(9):
        a, bb = P(-30 + k * 8, -10, 3.1), P(-30 + k * 8, -10 + (6 if k % 2 else 9), 3.1)
        s += f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{bb[0]:.1f}" y2="{bb[1]:.1f}" class="ln blkS"/>'
    s += box(-24, 14, 0, 54, 7, 7, top="a1f", left="a1d", right="a1d")
    tip = [P(-24, 14, 7), P(-24, 21, 7), P(-34, 17.5, 3.5)]
    s += poly([P(-24, 21, 0), P(-24, 21, 7), P(-34, 17.5, 3.5)], cls="l") + poly(tip, cls="t")
    ic["tools"] = icon(s)
    # letter blocks
    s = ""
    for i, (ch, cls) in enumerate((("M", "a1f"), ("P", "a2f"), ("C", "a3f"))):
        x = -42 + i * 30
        s += box(x, -12, 0, 24, 24, 24, top="t")
        s += f'<text transform="matrix(0.866,0.5,-0.866,0.5,{P(x + 12, 0, 24)[0]:.1f},{P(x + 12, 0, 24)[1]:.1f})" font-size="18" text-anchor="middle" dominant-baseline="central" class="dd {cls}">{ch}</text>'
    ic["type"] = icon(s, "-80 -60 160 110")
    # concept: stacked layers project > sequence > pads
    return ic

def layers(names=("Project", "Sequences", "Pads · banks A–H", "Samples")):
    BOUNDS.clear()
    s = ""
    cls = ["a3f", "a1f", "a2f", "t"]          # bottom → top
    for i in range(4):
        zz = i * 34
        s += box(-60, -60, zz, 120, 120, 8, top=cls[i])
        a = P(60, -60, zz + 4)
        lab = names[3 - i]
        s += f'<line x1="{a[0] + 4:.1f}" y1="{a[1]:.1f}" x2="{a[0] + 40:.1f}" y2="{a[1]:.1f}" class="ln blkS" stroke-dasharray="2 2"/>'
        s += f'<circle cx="{a[0] + 4:.1f}" cy="{a[1]:.1f}" r="1.6" class="lay-d"/>'
        s += f'<text x="{a[0] + 46:.1f}" y="{a[1] + 3.5:.1f}" class="lay-l">{lab}</text>'
        BOUNDS.append((a[0] + 46 + 9.5 * len(lab), a[1]))
    return f'<svg viewBox="{fit(10)}" class="iso-layers" role="img" aria-label="{" > ".join(names)}">{s}</svg>'

# Build: python3 gen.py src/css.part src/body_en.part src/body_pt.part src/js.part index.html
if __name__ == "__main__":
    css, en, pt, js, out = sys.argv[1:6]
    def fill(body, names, suffix):
        h = body.replace("{{DEVICE_ISO}}", device_iso()).replace("{{DEVICE_FLAT}}", device_flat()).replace("{{LAYERS}}", layers(names))
        for k, v in icons().items():
            h = h.replace("{{ICON_" + k.upper() + "}}", v)
        if suffix:
            for a, b in (("iso-gr", "iso-gr" + suffix), ("flat-gr", "flat-gr" + suffix), ('id="soft"', 'id="soft' + suffix + '"'), ("url(#soft)", "url(#soft" + suffix + ")")):
                h = h.replace(a, b)
        return h
    sw = '<div class="lang" role="group" aria-label="Language"><button type="button" data-set="en">EN</button><button type="button" data-set="pt">PT</button></div>'
    E = fill(open(en, encoding="utf-8").read(), ("Project", "Sequences", "Pads · banks A–H", "Samples"), "")
    T = fill(open(pt, encoding="utf-8").read(), ("Projeto", "Sequências", "Pads · bancos A–H", "Samples"), "pt")
    html = (open(css, encoding="utf-8").read() + '\n<div class="lroot" data-lang="en" lang="en">' + E + '</div>\n<div class="lroot" data-lang="pt" lang="pt-PT" hidden>' + T + '</div>\n' + open(js, encoding="utf-8").read()).replace("{{LANG_SWITCH}}", sw)
    assert "{{" not in html, html[html.index("{{"):html.index("{{") + 40]
    open(out, "w", encoding="utf-8").write(html)
    print("ok", len(html))
