import * as THREE from "three";

/**
 * Draws the Sakhi AI smartwatch AMOLED face onto a 1024×1024 canvas and
 * returns it as a THREE texture. `updateWatchFaceTexture(texture, t)` redraws
 * the face with live accents (pulsing Connected dot, breathing SOS glow) — call
 * it a few times per second and flip `needsUpdate`.
 */

const SIZE = 1024;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bgOuter: "#04060A",
  bgInner: "#0B1017",
  panel: "rgba(255, 255, 255, 0.05)",
  panelBorder: "rgba(255, 255, 255, 0.1)",
  text: "#F4F7FB",
  muted: "#8B95A3",
  emerald: "#22E6A0",
  emeraldSoft: "#17C98C",
  rose: "#F2956A",
  roseDeep: "#D4455C",
  red: "#E11D2E",
  redBright: "#FF3B30",
  blue: "#6FB7FF",
  gold: "#F5C97B",
};

const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
const FONT_HEAD = "'Nunito', 'Inter', system-ui, sans-serif";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 21);
  ctx.bezierCurveTo(4, 14, 1, 10, 1, 6.5);
  ctx.bezierCurveTo(1, 3, 3.5, 1, 6.5, 1);
  ctx.bezierCurveTo(9, 1, 11, 2.5, 12, 4.5);
  ctx.bezierCurveTo(13, 2.5, 15, 1, 17.5, 1);
  ctx.bezierCurveTo(20.5, 1, 23, 3, 23, 6.5);
  ctx.bezierCurveTo(23, 10, 20, 14, 12, 21);
  ctx.fill();
  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 23);
  ctx.bezierCurveTo(4, 14, 1.5, 9.5, 1.5, 6);
  ctx.arc(12, 6, 4.5, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(12, 6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.lineTo(21, 4.5);
  ctx.lineTo(21, 10.5);
  ctx.bezierCurveTo(21, 16.5, 17.5, 20.5, 12, 23);
  ctx.bezierCurveTo(6.5, 20.5, 3, 16.5, 3, 10.5);
  ctx.lineTo(3, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(4,6,10,0.85)";
  ctx.beginPath();
  ctx.moveTo(12, 3.4);
  ctx.lineTo(18.6, 6);
  ctx.lineTo(18.6, 10.6);
  ctx.bezierCurveTo(18.6, 15.2, 16.1, 18.6, 12, 20.6);
  ctx.bezierCurveTo(7.9, 18.6, 5.4, 15.2, 5.4, 10.6);
  ctx.lineTo(5.4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(8.2, 10.6);
  ctx.lineTo(11, 13.2);
  ctx.lineTo(16, 8);
  ctx.stroke();
  ctx.restore();
}

function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 26, s / 26);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 4.5, 20, 13, 3);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(22.5, 8, 2.6, 6, 1.3);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(3.2, 6.7, 12.5, 8.6, 1.6);
  ctx.fill();
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  // Heart mark
  drawHeart(ctx, 0, 0, s, C.roseDeep);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, t: number) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2;

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = ctx.createRadialGradient(cx, cy * 0.82, 60, cx, cy, R * 1.02);
  bg.addColorStop(0, C.bgInner);
  bg.addColorStop(0.55, "#0A0E15");
  bg.addColorStop(1, C.bgOuter);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Soft top glow (screen backlight)
  const glow = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy * 0.75, R);
  glow.addColorStop(0, "rgba(120, 190, 255, 0.07)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── Header: logo + battery ─────────────────────────────────────────────────
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  drawLogo(ctx, 108, 118, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 34px ${FONT_HEAD}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("SAKHI", 152, 118);
  ctx.fillStyle = C.emeraldSoft;
  ctx.fillText("AI", 152 + ctx.measureText("SAKHI").width + 10, 118);

  drawBattery(ctx, 830, 116, 34, pulse > 0.35 ? C.emerald : "#5f6b78");
  ctx.fillStyle = C.text;
  ctx.font = `700 30px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("92%", 816, 118);
  ctx.textAlign = "left";

  // ── Time ───────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 148px ${FONT_HEAD}`;
  ctx.textAlign = "center";
  ctx.fillText("12:45", cx, 322);
  ctx.textAlign = "left";

  ctx.fillStyle = C.muted;
  ctx.font = `600 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("FRI · 16 AUG · NEW DELHI", cx, 392);
  ctx.textAlign = "left";

  // ── Connected chip ─────────────────────────────────────────────────────────
  const chipY = 452;
  const chipW = 246;
  const chipX = cx - chipW / 2;
  roundRect(ctx, chipX, chipY - 26, chipW, 52, 26);
  ctx.fillStyle = "rgba(34, 230, 160, 0.1)";
  ctx.fill();
  ctx.strokeStyle = "rgba(34, 230, 160, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // pulsing dot + ring
  const dotX = chipX + 34;
  const dotY = chipY;
  ctx.strokeStyle = `rgba(34, 230, 160, ${0.45 - 0.3 * pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 11 + 7 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = C.emerald;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#EAFDF4";
  ctx.font = `700 27px ${FONT_HEAD}`;
  ctx.textAlign = "left";
  ctx.fillText("Connected", dotX + 24, dotY + 1);

  // ── Vitals grid (2×2) ──────────────────────────────────────────────────────
  const pillW = 316;
  const pillH = 108;
  const gap = 18;
  const gx0 = cx - (pillW * 2 + gap) / 2;
  const gy0 = 534;

  const vitals: Array<{ icon: "heart" | "pin" | "shield" | "battery"; label: string; value: string; iconColor: string; valueColor: string }> = [
    { icon: "heart", label: "Heart Rate", value: "74 BPM", iconColor: C.redBright, valueColor: "#FFFFFF" },
    { icon: "pin", label: "GPS Active", value: "28.61°N", iconColor: C.blue, valueColor: "#FFFFFF" },
    { icon: "shield", label: "Guardian Connected", value: "Aanya → Mom", iconColor: C.emerald, valueColor: "#FFFFFF" },
    { icon: "battery", label: "Battery", value: "92% · 3d 4h", iconColor: C.gold, valueColor: "#FFFFFF" },
  ];

  vitals.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = gx0 + col * (pillW + gap);
    const py = gy0 + row * (pillH + gap);

    roundRect(ctx, px, py, pillW, pillH, 22);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // icon
    const iconColor = v.icon === "heart" ? C.redBright : v.iconColor;
    if (v.icon === "heart") drawHeart(ctx, px + 40, py + pillH / 2, 34, iconColor);
    else if (v.icon === "pin") drawPin(ctx, px + 40, py + pillH / 2, 34, iconColor);
    else if (v.icon === "shield") drawShield(ctx, px + 40, py + pillH / 2, 34, iconColor);
    else drawBattery(ctx, px + 32, py + pillH / 2 - 6, 34, iconColor);

    ctx.fillStyle = C.muted;
    ctx.font = `600 23px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(v.label, px + 76, py + 42);
    ctx.fillStyle = v.valueColor;
    ctx.font = `800 30px ${FONT_HEAD}`;
    ctx.fillText(v.value, px + 76, py + 78);
    ctx.textAlign = "left";
  });

  // ── SOS button ─────────────────────────────────────────────────────────────
  const sosY = 742;
  const sosR = 132;
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.9);

  // outer glow ring
  const ring = ctx.createRadialGradient(cx, sosY, sosR * 0.55, cx, sosY, sosR * 1.5);
  ring.addColorStop(0, `rgba(255, 59, 48, ${0.34 + 0.16 * breathe})`);
  ring.addColorStop(1, "rgba(255, 59, 48, 0)");
  ctx.fillStyle = ring;
  ctx.fillRect(cx - sosR * 1.5, sosY - sosR * 1.5, sosR * 3, sosR * 3);

  // button body
  const body = ctx.createRadialGradient(cx - sosR * 0.35, sosY - sosR * 0.4, sosR * 0.15, cx, sosY, sosR);
  body.addColorStop(0, "#FF4B41");
  body.addColorStop(0.55, C.red);
  body.addColorStop(1, "#8F0F1B");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, sosY, sosR, 0, Math.PI * 2);
  ctx.fill();

  // rim highlight
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, sosY, sosR - 5, -Math.PI * 0.85, -Math.PI * 0.1);
  ctx.stroke();

  // outer pulse ring
  ctx.strokeStyle = `rgba(255, 59, 48, ${0.7 - 0.5 * breathe})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, sosY, sosR + 12 + 10 * breathe, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 92px ${FONT_HEAD}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SOS", cx, sosY + 6);
  ctx.textAlign = "left";

  // hold hint
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.font = `600 27px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Hold for 3 Seconds", cx, sosY + sosR + 52);
  ctx.textAlign = "left";

  // ── Status lines ───────────────────────────────────────────────────────────
  ctx.font = `700 24px ${FONT}`;
  const leftLine = "Live Protection Enabled";
  const rightLine = "Emergency Monitoring Active";
  const w1 = ctx.measureText(leftLine).width;
  const w2 = ctx.measureText(rightLine).width;
  const total = w1 + 40 + w2;
  const startX = cx - total / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = C.emerald;
  ctx.fillText(leftLine, startX, 972);
  ctx.fillStyle = "rgba(139,149,163,0.55)";
  ctx.fillText("·", startX + w1 + 12, 972);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(rightLine, startX + w1 + 40, 972);
  ctx.textAlign = "left";

  // ── Footer ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(139, 149, 163, 0.9)";
  ctx.font = `600 23px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Safe • Connected • Protected", cx, 1012);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function createWatchFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) drawFace(ctx, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function updateWatchFaceTexture(texture: THREE.CanvasTexture, t: number) {
  const canvas = texture.image as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawFace(ctx, t);
  texture.needsUpdate = true;
}
