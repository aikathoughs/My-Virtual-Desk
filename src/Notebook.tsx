import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  introClosingNote,
  introStickyNotes,
  notebookCategories,
  notebookPages,
  type NotebookCategoryTab,
  type NotebookPage,
  type StickyNoteItem,
} from "./data";
import { DESK_TOP, type HoverInfo, type NotebookState } from "./interaction";

export const PAGE_WIDTH = 1.22;
export const PAGE_DEPTH = 1.74;
export const PAGE_CENTER = PAGE_WIDTH / 2 + 0.02;
export const COVER_WIDTH = 1.3;
export const COVER_DEPTH = 1.84;
export const COVER_CENTER = COVER_WIDTH / 2;

const CLOSED_POS = new THREE.Vector3(-4.56, DESK_TOP + 0.03, 1.48);
const COVER_VIEW_POS = new THREE.Vector3(-4.82, DESK_TOP + 0.04, 1.65);
const OPEN_POS = new THREE.Vector3(-4.68, DESK_TOP + 0.04, 1.68);

type NotebookProps = {
  notebookState: NotebookState;
  activePage: number; // 1-indexed (1..notebookPages.length)
  targetTurnPage?: number | null;
  textScale?: number; // percentage, e.g. 80..130 (default 100)
  pageScrollProgress?: number; // 0..1 within-page vertical scroll when textScale is large
  onClickNotebook: () => void;
  onScrollNotebook: (direction: 1 | -1) => void;
  onSelectCategoryTab: (targetPage: number) => void;
  onHoverChange: (info: HoverInfo) => void;
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function measureWrappedTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let height = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      line = words[i];
      height += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    height += lineHeight;
  }
  return height;
}

function drawPageScrollIndicator(
  ctx: CanvasRenderingContext2D,
  scrollProgress: number,
  viewportTop: number,
  viewportHeight: number,
  contentHeight: number,
) {
  if (contentHeight <= viewportHeight + 6) return;
  const trackX = 864;
  const trackTop = viewportTop + 8;
  const trackHeight = viewportHeight - 16;

  ctx.save();
  ctx.strokeStyle = "rgba(110, 74, 52, 0.28)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackX, trackTop);
  ctx.lineTo(trackX, trackTop + trackHeight);
  ctx.stroke();

  const ratio = Math.max(0.18, Math.min(0.85, viewportHeight / contentHeight));
  const thumbH = Math.max(36, trackHeight * ratio);
  const thumbY = trackTop + (trackHeight - thumbH) * Math.max(0, Math.min(1, scrollProgress));

  ctx.fillStyle = "rgba(138, 62, 42, 0.72)";
  ctx.beginPath();
  ctx.roundRect(trackX - 4, thumbY, 8, thumbH, 4);
  ctx.fill();
  ctx.restore();
}

function drawHandStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color = "rgba(74, 58, 42, 0.65)",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color = "rgba(88, 66, 46, 0.62)",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.stroke();
  ctx.restore();
}

function drawOpenBookSketch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale = 1,
  color = "rgba(68, 52, 38, 0.72)",
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left page
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(-36, -28, -72, -16);
  ctx.lineTo(-72, 34);
  ctx.quadraticCurveTo(-36, 22, 0, 34);
  ctx.closePath();
  ctx.stroke();

  // Right page
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(36, -28, 72, -16);
  ctx.lineTo(72, 34);
  ctx.quadraticCurveTo(36, 22, 0, 34);
  ctx.closePath();
  ctx.stroke();

  // Lower cover edge
  ctx.beginPath();
  ctx.moveTo(-76, 38);
  ctx.quadraticCurveTo(-36, 28, 0, 40);
  ctx.quadraticCurveTo(36, 28, 76, 38);
  ctx.stroke();

  // Faint ruled lines on sketched pages
  ctx.lineWidth = 1.4;
  for (let row = -6; row <= 18; row += 12) {
    ctx.beginPath();
    ctx.moveTo(-56, row);
    ctx.quadraticCurveTo(-32, row - 5, -12, row + 2);
    ctx.moveTo(12, row + 2);
    ctx.quadraticCurveTo(32, row - 5, 56, row);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPencilIllustration(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angleRad = -0.18,
  scale = 1,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.scale(scale, scale);

  // Pencil body (warm yellow-ochre)
  ctx.fillStyle = "#e8b44c";
  ctx.strokeStyle = "#3b2c1e";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.rect(-52, -8, 86, 16);
  ctx.fill();
  ctx.stroke();

  // Pencil wood cone
  ctx.fillStyle = "#e5c79c";
  ctx.beginPath();
  ctx.moveTo(34, -8);
  ctx.lineTo(58, 0);
  ctx.lineTo(34, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Graphite tip
  ctx.fillStyle = "#2b2520";
  ctx.beginPath();
  ctx.moveTo(50, -3);
  ctx.lineTo(58, 0);
  ctx.lineTo(50, 3);
  ctx.closePath();
  ctx.fill();

  // Metal ferrule & pink eraser
  ctx.fillStyle = "#c9ced4";
  ctx.fillRect(-64, -8, 12, 16);
  ctx.strokeRect(-64, -8, 12, 16);

  ctx.fillStyle = "#e5989b";
  ctx.beginPath();
  ctx.roundRect(-78, -8, 14, 16, [4, 0, 0, 4]);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function createCoverTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1260;
  const ctx = canvas.getContext("2d")!;

  // Warm cream / slightly aged personal academic journal cardstock
  const grad = ctx.createLinearGradient(0, 0, 900, 1260);
  grad.addColorStop(0, "#ede2c7");
  grad.addColorStop(0.55, "#e4d6b5");
  grad.addColorStop(1, "#d8c7a0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 1260);

  // Subtle paper grain & aged fibers
  for (let i = 0; i < 2200; i++) {
    const x = (i * 97) % 900;
    const y = (i * 193) % 1260;
    ctx.fillStyle = i % 2 === 0 ? "rgba(75, 52, 32, 0.04)" : "rgba(255, 250, 235, 0.055)";
    ctx.fillRect(x, y, 2, 2);
  }

  // Left binding shadow strip
  const spineGrad = ctx.createLinearGradient(0, 0, 72, 0);
  spineGrad.addColorStop(0, "rgba(42, 28, 18, 0.32)");
  spineGrad.addColorStop(1, "rgba(42, 28, 18, 0)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, 72, 1260);

  // Hand-drawn double notebook frame with corner flourishes
  ctx.strokeStyle = "rgba(70, 52, 36, 0.72)";
  ctx.lineWidth = 3.2;
  ctx.strokeRect(78, 68, 756, 1124);
  ctx.strokeStyle = "rgba(70, 52, 36, 0.38)";
  ctx.lineWidth = 1.6;
  ctx.strokeRect(92, 82, 728, 1096);

  // Corner sparkles
  drawSparkle(ctx, 118, 108, 12, "rgba(122, 62, 44, 0.65)");
  drawSparkle(ctx, 794, 108, 12, "rgba(122, 62, 44, 0.65)");
  drawSparkle(ctx, 118, 1152, 12, "rgba(122, 62, 44, 0.65)");
  drawSparkle(ctx, 794, 1152, 12, "rgba(122, 62, 44, 0.65)");

  // 1. TOP HEADER (smaller & subtle): GREAT BOOKS — GEC-GB-NRt
  ctx.fillStyle = "#5a4330";
  ctx.font = "700 28px 'Kalam', 'Caveat', cursive";
  ctx.textAlign = "center";
  ctx.fillText("GREAT BOOKS — GEC-GB-NRt", 462, 178);

  // Subtle hand-drawn divider under top header
  ctx.strokeStyle = "rgba(90, 67, 48, 0.48)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(230, 198);
  ctx.quadraticCurveTo(462, 204, 694, 198);
  ctx.stroke();
  drawHandStar(ctx, 206, 196, 8, "rgba(138, 68, 48, 0.65)");
  drawHandStar(ctx, 718, 196, 8, "rgba(138, 68, 48, 0.65)");

  // 2. MAIN TITLE (most visually prominent element, elegant handwritten lettering):
  // MY LITERARY JOURNEY
  // Warm pastel marker highlight strip behind "LITERARY"
  ctx.save();
  ctx.translate(462, 448);
  ctx.rotate(-0.012);
  ctx.fillStyle = "rgba(242, 202, 82, 0.42)";
  ctx.beginPath();
  ctx.roundRect(-270, -56, 540, 74, 14);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#221811";
  ctx.font = "700 76px 'Kalam', 'Caveat', cursive";
  ctx.fillText("MY", 462, 344);
  ctx.font = "700 86px 'Kalam', 'Caveat', cursive";
  ctx.fillText("LITERARY", 462, 452);
  ctx.font = "700 84px 'Kalam', 'Caveat', cursive";
  ctx.fillText("JOURNEY", 462, 560);

  // Hand-drawn terracotta double underline beneath MAIN TITLE
  ctx.strokeStyle = "#8d3b29";
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(210, 590);
  ctx.quadraticCurveTo(462, 602, 714, 588);
  ctx.stroke();

  ctx.strokeStyle = "rgba(141, 59, 41, 0.55)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(260, 604);
  ctx.quadraticCurveTo(462, 614, 664, 602);
  ctx.stroke();

  // Hand-drawn pencil doodles & literary decorations around the center
  drawHandStar(ctx, 190, 392, 15, "rgba(141, 59, 41, 0.7)");
  drawSparkle(ctx, 738, 382, 16, "rgba(92, 68, 44, 0.7)");
  drawHandStar(ctx, 726, 512, 13, "rgba(141, 59, 41, 0.65)");
  drawSparkle(ctx, 196, 520, 14, "rgba(92, 68, 44, 0.65)");

  // Central pencil illustration: Open Book with rising stars & pencil doodle
  drawOpenBookSketch(ctx, 462, 760, 1.55, "rgba(62, 46, 32, 0.78)");
  drawSparkle(ctx, 462, 688, 15, "rgba(141, 59, 41, 0.75)");
  drawHandStar(ctx, 404, 704, 10, "rgba(92, 68, 44, 0.68)");
  drawHandStar(ctx, 520, 704, 10, "rgba(92, 68, 44, 0.68)");

  // Small botanical leaf sprigs left and right of the book sketch
  ctx.strokeStyle = "rgba(74, 92, 66, 0.65)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(310, 790);
  ctx.quadraticCurveTo(268, 770, 240, 742);
  ctx.moveTo(614, 790);
  ctx.quadraticCurveTo(656, 770, 684, 742);
  ctx.stroke();

  // Sketched pencil below the book
  drawPencilIllustration(ctx, 462, 878, -0.06, 1.15);

  // 3. FOOTER: SUMMARY ANALYSIS & REFLECTION
  ctx.strokeStyle = "rgba(90, 67, 48, 0.42)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(190, 1012);
  ctx.lineTo(734, 1012);
  ctx.stroke();

  ctx.fillStyle = "#3c2a1b";
  ctx.font = "700 31px 'Kalam', 'Caveat', cursive";
  ctx.fillText("SUMMARY ANALYSIS & REFLECTION", 462, 1068);

  ctx.fillStyle = "#6e5239";
  ctx.font = "700 24px 'Caveat', cursive";
  ctx.fillText("✦ Angelaica Mae P. Harochoc • 4th Year BSIT ✦", 462, 1114);
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function createInsideCoverTexture(textScale = 100): THREE.CanvasTexture {
  const scale = Math.max(0.8, Math.min(1.35, textScale / 100));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1512;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1.2, 1.2);

  // Warm inner cover cardstock base
  ctx.fillStyle = "#e3d6b7";
  ctx.fillRect(0, 0, 900, 1260);

  // Subtle right-edge spine crease shading for natural book depth
  const spineGrad = ctx.createLinearGradient(848, 0, 900, 0);
  spineGrad.addColorStop(0, "rgba(40, 28, 18, 0)");
  spineGrad.addColorStop(1, "rgba(40, 28, 18, 0.14)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(848, 0, 52, 1260);

  // Subtle paper fibers
  for (let i = 0; i < 1500; i++) {
    const x = (i * 89) % 900;
    const y = (i * 173) % 1260;
    ctx.fillStyle = i % 2 === 0 ? "rgba(70, 50, 32, 0.035)" : "rgba(255, 250, 238, 0.045)";
    ctx.fillRect(x, y, 2, 2);
  }

  // Faint dotted journal border on inside cover
  ctx.strokeStyle = "rgba(84, 64, 44, 0.42)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(52, 48, 796, 1164);
  ctx.setLineDash([]);

  // Handwritten top heading on inside front cover
  const headerFontPx = Math.round(30 * Math.min(1.1, scale));
  ctx.fillStyle = "#3e1e12";
  ctx.font = `700 ${headerFontPx}px 'Kalam', 'Caveat', cursive`;
  ctx.textAlign = "center";
  ctx.fillText("✦ INSIDE FRONT COVER — INTRODUCTION NOTES ✦", 450, 94, 710);
  ctx.textAlign = "left";

  // Small decorative pencil doodles in the corners of the inside cover
  drawSparkle(ctx, 88, 92, 11, "rgba(110, 68, 46, 0.6)");
  drawSparkle(ctx, 812, 92, 11, "rgba(110, 68, 46, 0.6)");
  drawHandStar(ctx, 450, 560, 12, "rgba(110, 68, 46, 0.45)");

  // Bottom decorative closing note area (also reinforced by the 3D closing note strip)
  ctx.fillStyle = "rgba(255, 251, 240, 0.94)";
  ctx.strokeStyle = "rgba(92, 68, 46, 0.56)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(72, 1064, 716, 94, 12);
  ctx.fill();
  ctx.stroke();

  drawPencilIllustration(ctx, 148, 1112, -0.14, 0.86);
  const closingFontPx = Math.round(28 * Math.min(1.12, scale));
  ctx.fillStyle = "#160f09";
  ctx.font = `700 ${closingFontPx}px 'Kalam', 'Caveat', cursive`;
  ctx.fillText(introClosingNote, 214, 1121, 554);

  // Page 01 / 20 counter at bottom right of inside front cover
  ctx.fillStyle = "#2b1d12";
  ctx.font = "700 22px 'Kalam', 'IBM Plex Mono', cursive";
  ctx.textAlign = "right";
  ctx.fillText(`PAGE 01 / ${String(notebookPages.length).padStart(2, "0")}`, 812, 1196);
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function createStickyNoteTexture(
  note: StickyNoteItem,
  textScale = 100,
  scrollProgress = 0,
): THREE.CanvasTexture {
  const scale = Math.max(0.8, Math.min(1.35, textScale / 100));
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1.25, 1.25);

  // Pastel sticky note paper base
  ctx.fillStyle = note.color;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle top adhesive strip shading & bottom curl highlight
  const topShade = ctx.createLinearGradient(0, 0, 0, 64);
  topShade.addColorStop(0, "rgba(40, 30, 20, 0.06)");
  topShade.addColorStop(1, "rgba(40, 30, 20, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, 512, 64);

  // Faint ruled lines on the sticky note
  ctx.strokeStyle = "rgba(80, 95, 110, 0.14)";
  ctx.lineWidth = 1.5;
  for (let y = 126; y <= 450; y += 38) {
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.lineTo(480, y);
    ctx.stroke();
  }

  // Subtle border
  ctx.strokeStyle = "rgba(60, 48, 36, 0.32)";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 504);

  // Sticky note handwritten title
  const titlePx = Math.round(31 * Math.min(1.12, scale));
  ctx.fillStyle = "#521c0e";
  ctx.font = `700 ${titlePx}px 'Kalam', 'Caveat', cursive`;
  ctx.fillText(note.title, 30, 78, 452);

  // Hand-drawn wavy underline under title
  ctx.strokeStyle = "rgba(110, 46, 32, 0.56)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(30, 92);
  ctx.quadraticCurveTo(220, 98, 440, 90);
  ctx.stroke();

  // Handwritten body text with safe clipping & scroll support at large text sizes
  const bodyPx = Math.round(26 * scale * 10) / 10;
  const bodyLineH = Math.round(37.5 * scale * 10) / 10;
  ctx.font = `700 ${bodyPx}px 'Kalam', 'Patrick Hand', cursive`;
  const measuredH = measureWrappedTextHeight(ctx, note.body, 452, bodyLineH);
  const safeViewportH = 316;
  const maxScroll = Math.max(0, measuredH - safeViewportH);
  const scrollOffset = maxScroll * Math.max(0, Math.min(1, scrollProgress));

  ctx.save();
  ctx.beginPath();
  ctx.rect(24, 102, 464, safeViewportH);
  ctx.clip();
  ctx.fillStyle = "#0b1117";
  wrapText(ctx, note.body, 30, 136 - scrollOffset, 452, bodyLineH);
  ctx.restore();

  // Small pencil doodle / sticker in the bottom-right corner of the sticky note
  if (note.doodleType === "star") {
    drawHandStar(ctx, 448, 452, 20, "rgba(138, 68, 42, 0.72)");
    drawSparkle(ctx, 408, 464, 11, "rgba(90, 68, 44, 0.6)");
  } else if (note.doodleType === "heart-book") {
    drawOpenBookSketch(ctx, 434, 454, 0.52, "rgba(122, 54, 64, 0.72)");
    drawSparkle(ctx, 434, 424, 10, "rgba(122, 54, 64, 0.72)");
  } else if (note.doodleType === "sparkle") {
    drawSparkle(ctx, 448, 448, 18, "rgba(52, 98, 128, 0.75)");
    drawHandStar(ctx, 406, 462, 12, "rgba(52, 98, 128, 0.65)");
  } else {
    // Small retro CRT monitor doodle
    ctx.save();
    ctx.strokeStyle = "rgba(68, 56, 42, 0.72)";
    ctx.lineWidth = 2.4;
    ctx.strokeRect(412, 426, 56, 42);
    ctx.strokeRect(420, 433, 40, 26);
    ctx.beginPath();
    ctx.moveTo(426, 468);
    ctx.lineTo(454, 468);
    ctx.moveTo(418, 476);
    ctx.lineTo(462, 476);
    ctx.stroke();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function drawPagePencilDoodles(
  ctx: CanvasRenderingContext2D,
  pageNumber: number,
  categoryColor: string,
) {
  // 1. Small pencil doodles in the left margin (x = 18..80) so they never overlap text
  const seed = pageNumber * 7;
  drawHandStar(ctx, 46, 220 + (seed % 50), 11, "rgba(92, 74, 56, 0.52)");
  drawSparkle(ctx, 46, 520 + (seed % 70), 12, "rgba(92, 74, 56, 0.48)");

  // Small botanical flower / leaf sketch in left margin
  const fy = 820 + (seed % 60);
  ctx.save();
  ctx.strokeStyle = "rgba(86, 70, 54, 0.5)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(46, fy + 28);
  ctx.quadraticCurveTo(42, fy + 10, 48, fy - 8);
  ctx.stroke();
  for (let a = 0; a < 5; a++) {
    const ang = (a * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(48 + Math.cos(ang) * 7, fy - 12 + Math.sin(ang) * 7, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Top-right corner open book or sparkle doodle
  if (pageNumber % 2 === 0) {
    drawOpenBookSketch(ctx, 792, 118, 0.46, "rgba(88, 68, 50, 0.55)");
  } else {
    drawSparkle(ctx, 804, 114, 13, categoryColor);
    drawHandStar(ctx, 774, 128, 9, "rgba(88, 68, 50, 0.55)");
  }
}

function drawPaperClipDoodle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angleRad = 0.12,
  scale = 1,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "rgba(86, 94, 104, 0.78)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, -28);
  ctx.lineTo(-10, 26);
  ctx.arc(4, 26, 14, Math.PI, 0, true);
  ctx.lineTo(18, -32);
  ctx.arc(0, -32, 18, 0, Math.PI, true);
  ctx.lineTo(-18, 22);
  ctx.stroke();
  ctx.restore();
}

function drawCurvedArrowDoodle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  color = "rgba(138, 58, 40, 0.68)",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  const ang = Math.atan2(y2 - cy, x2 - cx);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 11 * Math.cos(ang - 0.45), y2 - 11 * Math.sin(ang - 0.45));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 11 * Math.cos(ang + 0.45), y2 - 11 * Math.sin(ang + 0.45));
  ctx.stroke();
  ctx.restore();
}

function drawTableOfContentsPage(
  ctx: CanvasRenderingContext2D,
  page: NotebookPage,
  textScale = 100,
  scrollProgress = 0,
) {
  const scale = Math.max(0.8, Math.min(1.35, textScale / 100));

  // Paper clip sketch at top-left margin
  drawPaperClipDoodle(ctx, 56, 86, -0.14, 1.05);

  // Top eyebrow & schedule tag
  ctx.fillStyle = "#f2cf5b";
  ctx.fillRect(116, 46, 12, 22);
  ctx.fillStyle = "#4e1e12";
  ctx.font = "700 21px 'Kalam', 'Caveat', cursive";
  ctx.fillText(page.eyebrow, 138, 64, 520);

  if (page.dateTag) {
    ctx.fillStyle = "#192832";
    ctx.font = "700 21px 'Kalam', 'Caveat', cursive";
    ctx.textAlign = "right";
    ctx.fillText(page.dateTag, 836, 64);
    ctx.textAlign = "left";
  }

  // Warm marker highlight behind "Table of Contents"
  ctx.fillStyle = "rgba(242, 206, 82, 0.44)";
  ctx.beginPath();
  ctx.roundRect(114, 82, 424, 46, 10);
  ctx.fill();

  // Handwritten Heading: "Table of Contents"
  const headingPx = Math.round(45 * Math.min(1.1, scale));
  ctx.fillStyle = "#081420";
  ctx.font = `700 ${headingPx}px 'Kalam', 'Caveat', cursive`;
  ctx.fillText("Table of Contents", 122, 119, 550);

  // Small open book + stars doodle in top-right area
  drawOpenBookSketch(ctx, 768, 114, 0.58, "rgba(76, 56, 38, 0.68)");
  drawSparkle(ctx, 704, 96, 11, "rgba(138, 64, 42, 0.65)");
  drawHandStar(ctx, 828, 96, 10, "rgba(138, 64, 42, 0.65)");

  // Subtitle & hand-drawn double underline
  const subPx = Math.round(25.5 * Math.min(1.12, scale));
  ctx.fillStyle = "#441b10";
  ctx.font = `700 ${subPx}px 'Caveat', 'Kalam', cursive`;
  ctx.fillText("A Guide to My Literary Journey Notebook", 120, 153, 700);

  ctx.strokeStyle = "rgba(141, 59, 41, 0.62)";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(116, 166);
  ctx.quadraticCurveTo(476, 173, 836, 165);
  ctx.stroke();

  // Organized Table of Contents Entries corresponding to actual notebook sections
  const tocEntries = [
    {
      num: "01",
      title: "Introduction Sticky Notes",
      sub: "Inside Front Cover — About Me, Reading & Project",
      pages: "p. 01",
      color: "#f2cf5b",
    },
    {
      num: "02",
      title: "Table of Contents",
      sub: "Notebook Section Index & Reading Guide",
      pages: "p. 02",
      color: "#f2cf5b",
    },
    {
      num: "03",
      title: "Literary Analyses I–II (Books I)",
      sub: "The Tale of Genji (Historical) • Pride and Prejudice (Feminist)",
      pages: "pp. 03–04",
      color: "#f0934b",
    },
    {
      num: "04",
      title: "Literary Analyses III–IV (Books II)",
      sub: "Les Misérables (Marxist) • To Kill a Mockingbird (Historical)",
      pages: "pp. 05–06",
      color: "#6baed6",
    },
    {
      num: "05",
      title: "Literary Analyses V–VII (Books III)",
      sub: "Job 38 (Formalist) • The Iliad & The Odyssey (Archetypal)",
      pages: "pp. 07–10",
      color: "#e58ca8",
    },
    {
      num: "06",
      title: "My Favorite Literary Masterpiece",
      sub: "Voice Out of the Whirlwind (Job 38) — Themes & Realizations",
      pages: "pp. 11–12",
      color: "#7ec488",
    },
    {
      num: "07",
      title: "Summary of Learning",
      sub: "Masterpieces Across Cultures, 5 Critical Lenses & Skills",
      pages: "pp. 13–14",
      color: "#f2cf5b",
    },
    {
      num: "08",
      title: "Reflect — Personal Notes & Reflections",
      sub: "Personal Journal Reflections, Human Nature & IT Growth",
      pages: "pp. 15–18",
      color: "#f0934b",
    },
    {
      num: "09",
      title: "References & Portfolio Checklist",
      sub: "Primary Texts, Historical Context Sources & Sign-Off",
      pages: "pp. 19–20",
      color: "#6baed6",
    },
  ];

  const viewportTop = 176;
  const viewportHeight = 936; // 176..1112
  const introFontPx = Math.round(22.5 * scale * 10) / 10;
  const introLineH = Math.round(30 * scale * 10) / 10;
  ctx.font = `700 ${introFontPx}px 'Kalam', 'Caveat', cursive`;
  const introH = measureWrappedTextHeight(ctx, page.paragraphs[0], 716, introLineH);
  const rowStep = Math.max(82, Math.round(82 * scale));
  const totalContentH = introH + 26 + tocEntries.length * rowStep + 56;
  const maxScroll = Math.max(0, totalContentH - viewportHeight);
  const scrollOffset = maxScroll * Math.max(0, Math.min(1, scrollProgress));

  ctx.save();
  ctx.beginPath();
  ctx.rect(24, viewportTop, 832, viewportHeight);
  ctx.clip();

  // Brief intro line
  ctx.fillStyle = "#0a1117";
  ctx.font = `700 ${introFontPx}px 'Kalam', 'Caveat', cursive`;
  const afterIntroY = wrapText(
    ctx,
    page.paragraphs[0],
    116,
    viewportTop + 34 - scrollOffset,
    716,
    introLineH,
  );

  let rowY = afterIntroY + 34;
  const numPx = Math.round(19 * Math.min(1.15, scale));
  const titlePx = Math.round(24.5 * scale * 10) / 10;
  const pageBadgePx = Math.round(19.5 * Math.min(1.14, scale));
  const itemSubPx = Math.round(20.5 * scale * 10) / 10;

  for (const item of tocEntries) {
    // Colored category tab pill on the left
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(116, rowY - 24, 40, 30, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 30, 20, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#14100b";
    ctx.font = `700 ${numPx}px 'Kalam', cursive`;
    ctx.textAlign = "center";
    ctx.fillText(item.num, 136, rowY - 2);
    ctx.textAlign = "left";

    // Section title
    ctx.fillStyle = "#081420";
    ctx.font = `700 ${titlePx}px 'Kalam', 'Caveat', cursive`;
    ctx.fillText(item.title, 168, rowY - 2, 534);

    // Dotted leader line between title and page badge
    const titleW = Math.min(534, ctx.measureText(item.title).width);
    const dotsStart = 178 + titleW;
    const dotsEnd = 706;
    if (dotsEnd > dotsStart + 20) {
      ctx.strokeStyle = "rgba(96, 76, 56, 0.44)";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 8]);
      ctx.beginPath();
      ctx.moveTo(dotsStart, rowY - 7);
      ctx.lineTo(dotsEnd, rowY - 7);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Highlighted page range pill on right
    ctx.fillStyle = "rgba(242, 206, 62, 0.5)";
    ctx.beginPath();
    ctx.roundRect(714, rowY - 24, 122, 28, 6);
    ctx.fill();

    ctx.fillStyle = "#181009";
    ctx.font = `700 ${pageBadgePx}px 'Kalam', cursive`;
    ctx.textAlign = "right";
    ctx.fillText(item.pages, 826, rowY - 3);
    ctx.textAlign = "left";

    // Subtitle description line
    ctx.fillStyle = "#26180e";
    ctx.font = `700 ${itemSubPx}px 'Caveat', 'Kalam', cursive`;
    ctx.fillText(`↳ ${item.sub}`, 174, rowY + Math.round(23 * scale), 654);

    rowY += rowStep;
  }

  // Margin doodles: stars, curved arrow & sketched pencil at bottom
  drawHandStar(ctx, 48, 340, 12, "rgba(138, 64, 42, 0.58)");
  drawSparkle(ctx, 48, 560, 13, "rgba(92, 74, 56, 0.55)");
  drawCurvedArrowDoodle(ctx, 34, 710, 56, 750, 98, 748, "rgba(138, 58, 40, 0.62)");
  drawHandStar(ctx, 48, 920, 11, "rgba(138, 64, 42, 0.55)");

  // Highlight chips & sketched pencil at bottom of TOC list
  let chipX = 116;
  const chipY = rowY + 4;
  const chipPx = Math.round(19 * Math.min(1.1, scale));
  ctx.font = `700 ${chipPx}px 'Kalam', 'Caveat', cursive`;
  for (const term of page.highlights) {
    const w = ctx.measureText(term).width + 20;
    ctx.fillStyle = "rgba(242, 206, 62, 0.56)";
    ctx.beginPath();
    ctx.roundRect(chipX, chipY - 24, w, 32, 6);
    ctx.fill();
    ctx.fillStyle = "#0e1518";
    ctx.fillText(term, chipX + 10, chipY - 2);
    chipX += w + 10;
  }
  drawPencilIllustration(ctx, 766, chipY - 8, -0.08, 0.86);
  ctx.restore();

  drawPageScrollIndicator(ctx, scrollProgress, viewportTop, viewportHeight, totalContentH);

  // Footer divider, annotation & page counter
  ctx.strokeStyle = "rgba(68, 56, 42, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(116, 1124);
  ctx.lineTo(836, 1124);
  ctx.stroke();

  const annotPx = Math.round(27.5 * Math.min(1.1, scale));
  ctx.fillStyle = "#562014";
  ctx.font = `700 ${annotPx}px 'Caveat', 'Kalam', cursive`;
  ctx.fillText(page.annotation, 116, 1158, 720);

  const doodlePx = Math.round(21 * Math.min(1.1, scale));
  ctx.fillStyle = "#19334a";
  ctx.font = `700 ${doodlePx}px 'Caveat', 'Kalam', cursive`;
  ctx.fillText(page.doodle, 116, 1198, 540);

  ctx.fillStyle = "#1b140d";
  ctx.font = "700 22px 'Kalam', 'IBM Plex Mono', cursive";
  ctx.textAlign = "right";
  ctx.fillText(
    `PAGE ${String(page.pageNumber).padStart(2, "0")} / ${String(notebookPages.length).padStart(2, "0")}`,
    836,
    1198,
  );
  ctx.textAlign = "left";
}

function createPageTexture(
  page: NotebookPage,
  textScale = 100,
  scrollProgress = 0,
): THREE.CanvasTexture {
  const scale = Math.max(0.8, Math.min(1.35, textScale / 100));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1512;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1.2, 1.2);
  const categoryColor =
    notebookCategories.find((c) => c.id === page.categoryId)?.color ?? "#d49a56";

  // Warm off-white lined notebook paper
  ctx.fillStyle = "#ede4ca";
  ctx.fillRect(0, 0, 900, 1260);

  // Subtle book-spine gutter shading along inner binding edge
  const isRightPage = page.pageNumber % 2 === 0;
  const gutterGrad = isRightPage
    ? ctx.createLinearGradient(0, 0, 56, 0)
    : ctx.createLinearGradient(844, 0, 900, 0);
  if (isRightPage) {
    gutterGrad.addColorStop(0, "rgba(38, 26, 16, 0.14)");
    gutterGrad.addColorStop(1, "rgba(38, 26, 16, 0)");
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(0, 0, 56, 1260);
  } else {
    gutterGrad.addColorStop(0, "rgba(38, 26, 16, 0)");
    gutterGrad.addColorStop(1, "rgba(38, 26, 16, 0.14)");
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(844, 0, 56, 1260);
  }

  // Light blue horizontal writing lines
  ctx.strokeStyle = "rgba(62, 118, 150, 0.24)";
  ctx.lineWidth = 1.5;
  for (let y = 182; y < 1120; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
  }

  // Subtle red vertical margin line
  ctx.strokeStyle = "rgba(186, 64, 58, 0.46)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 0);
  ctx.lineTo(92, 1260);
  ctx.stroke();

  // Dedicated handwritten Table of Contents layout for Page 02
  if (page.pageNumber === 2) {
    drawTableOfContentsPage(ctx, page, textScale, scrollProgress);
    const tocTexture = new THREE.CanvasTexture(canvas);
    tocTexture.colorSpace = THREE.SRGBColorSpace;
    tocTexture.anisotropy = 16;
    tocTexture.needsUpdate = true;
    return tocTexture;
  }

  // Realistic pencil doodles in safe margin zones
  drawPagePencilDoodles(ctx, page.pageNumber, categoryColor);

  // Category color bar + top eyebrow metadata
  ctx.fillStyle = categoryColor;
  ctx.fillRect(116, 46, 12, 22);

  ctx.fillStyle = "#4e1e12";
  ctx.font = "700 21px 'Kalam', 'Caveat', cursive";
  ctx.fillText(page.eyebrow, 138, 64, 530);

  if (page.dateTag) {
    ctx.fillStyle = "#192832";
    ctx.font = "700 21px 'Kalam', 'Caveat', cursive";
    ctx.textAlign = "right";
    ctx.fillText(page.dateTag, 836, 64);
    ctx.textAlign = "left";
  }

  // Handwritten Page Title + optional Subtitle + hand-drawn wavy rule
  const titlePx = Math.round(39 * Math.min(1.1, scale));
  ctx.fillStyle = "#081420";
  ctx.font = `700 ${titlePx}px 'Kalam', 'Caveat', cursive`;
  ctx.fillText(page.title, 116, 114, 640);

  let headerBottomY = 148;
  if (page.subtitle) {
    const subPx = Math.round(25 * Math.min(1.12, scale));
    ctx.fillStyle = "#441b10";
    ctx.font = `700 ${subPx}px 'Caveat', 'Kalam', cursive`;
    ctx.fillText(page.subtitle, 116, headerBottomY, 710);
    headerBottomY += 20;
  }

  ctx.strokeStyle = "rgba(141, 59, 41, 0.58)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(116, headerBottomY);
  ctx.quadraticCurveTo(476, headerBottomY + 5, 836, headerBottomY);
  ctx.stroke();

  // Measure scrollable middle content height so large text sizes scroll cleanly without overlapping footer
  const viewportTop = headerBottomY + 10;
  const viewportBottom = 1112;
  const viewportHeight = viewportBottom - viewportTop;

  const bodyFontPx = Math.round(23 * scale * 10) / 10;
  const bodyLineH = Math.round(32 * scale * 10) / 10;
  const bulletTitlePx = Math.round(23 * scale * 10) / 10;
  const bulletItemPx = Math.round(21 * scale * 10) / 10;
  const bulletLineH = Math.round(28.5 * scale * 10) / 10;
  const chipFontPx = Math.round(20.5 * scale * 10) / 10;

  let measuredH = 26;
  ctx.font = `700 ${bodyFontPx}px 'Kalam', 'Caveat', cursive`;
  for (const paragraph of page.paragraphs) {
    measuredH += measureWrappedTextHeight(ctx, paragraph, 716, bodyLineH) + 15;
  }
  if (page.bullets.length > 0) {
    measuredH += 42;
    ctx.font = `700 ${bulletItemPx}px 'Kalam', 'Caveat', cursive`;
    for (const item of page.bullets) {
      measuredH += measureWrappedTextHeight(ctx, item, 668, bulletLineH) + 5;
    }
    measuredH += 22;
  }
  if (page.highlights.length > 0) {
    measuredH += 16;
    let testChipX = 116;
    let chipRows = 1;
    ctx.font = `700 ${chipFontPx}px 'Kalam', 'Caveat', cursive`;
    for (const term of page.highlights) {
      const w = ctx.measureText(term).width + 24;
      if (testChipX + w > 836) {
        testChipX = 116;
        chipRows++;
      }
      testChipX += w + 12;
    }
    measuredH += chipRows * 38;
  }

  const maxScroll = Math.max(0, measuredH - viewportHeight);
  const scrollOffset = maxScroll * Math.max(0, Math.min(1, scrollProgress));

  ctx.save();
  ctx.beginPath();
  ctx.rect(56, viewportTop, 796, viewportHeight);
  ctx.clip();

  let cursorY = viewportTop + 28 - scrollOffset;
  ctx.fillStyle = "#091016";
  ctx.font = `700 ${bodyFontPx}px 'Kalam', 'Caveat', cursive`;
  for (const paragraph of page.paragraphs) {
    cursorY = wrapText(ctx, paragraph, 116, cursorY, 716, bodyLineH);
    cursorY += 15;
  }

  // Handwritten Key Notes Box with hand-drawn bracket & stars
  if (page.bullets.length > 0) {
    cursorY += 6;
    const boxTop = cursorY - 20;

    // Measure bullet box height first so we can draw the warm tinted background box cleanly
    ctx.font = `700 ${bulletItemPx}px 'Kalam', 'Caveat', cursive`;
    let bulletContentH = 34;
    for (const item of page.bullets) {
      bulletContentH += measureWrappedTextHeight(ctx, item, 668, bulletLineH) + 5;
    }
    const boxHeight = bulletContentH + 8;

    ctx.fillStyle = "rgba(110, 58, 44, 0.085)";
    ctx.fillRect(116, boxTop, 720, boxHeight);
    ctx.fillStyle = categoryColor;
    ctx.fillRect(116, boxTop, 5, boxHeight);

    // Heading inside callout
    ctx.fillStyle = "#4c1c10";
    ctx.font = `700 ${bulletTitlePx}px 'Kalam', 'Caveat', cursive`;
    ctx.fillText(page.bulletsTitle ?? "KEY STUDY POINTS:", 134, cursorY + 4, 690);
    cursorY += 34;

    ctx.font = `700 ${bulletItemPx}px 'Kalam', 'Caveat', cursive`;
    for (const item of page.bullets) {
      ctx.fillStyle = "#6e2516";
      ctx.fillText("☆", 132, cursorY);
      ctx.fillStyle = "#0a1116";
      cursorY = wrapText(ctx, item, 158, cursorY, 668, bulletLineH);
      cursorY += 5;
    }

    // Hand-drawn curly bracket in the left margin next to the notes box
    ctx.strokeStyle = "rgba(122, 47, 30, 0.55)";
    ctx.lineWidth = 2.2;
    const midY = boxTop + boxHeight / 2;
    ctx.beginPath();
    ctx.moveTo(82, boxTop + 8);
    ctx.quadraticCurveTo(68, boxTop + 8, 68, midY - 8);
    ctx.lineTo(60, midY);
    ctx.lineTo(68, midY + 8);
    ctx.quadraticCurveTo(68, boxTop + boxHeight - 8, 82, boxTop + boxHeight - 8);
    ctx.stroke();

    cursorY += 16;
  }

  // Highlighted important phrases (marker highlight strips + handwritten underline)
  if (page.highlights.length > 0) {
    cursorY += 12;
    let chipX = 116;
    ctx.font = `700 ${chipFontPx}px 'Kalam', 'Caveat', cursive`;
    for (const term of page.highlights) {
      const w = ctx.measureText(term).width + 24;
      if (chipX + w > 836) {
        chipX = 116;
        cursorY += 38;
      }
      ctx.fillStyle = "rgba(242, 206, 62, 0.56)";
      ctx.beginPath();
      ctx.roundRect(chipX, cursorY - 24, w, 32, 6);
      ctx.fill();
      ctx.fillStyle = "#0e1518";
      ctx.fillText(term, chipX + 12, cursorY - 2);

      // Subtle pencil underline under highlighted phrase
      ctx.strokeStyle = "rgba(122, 59, 46, 0.45)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(chipX + 8, cursorY + 5);
      ctx.lineTo(chipX + w - 8, cursorY + 5);
      ctx.stroke();

      chipX += w + 12;
    }
  }
  ctx.restore();

  drawPageScrollIndicator(ctx, scrollProgress, viewportTop, viewportHeight, measuredH);

  // Clean bottom footer divider, handwritten margin note, doodle & page counter
  ctx.strokeStyle = "rgba(68, 56, 42, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(116, 1124);
  ctx.lineTo(836, 1124);
  ctx.stroke();

  const annotPx = Math.round(27.5 * Math.min(1.1, scale));
  ctx.fillStyle = "#562014";
  ctx.font = `700 ${annotPx}px 'Caveat', 'Kalam', cursive`;
  ctx.fillText(page.annotation, 116, 1158, 720);

  const doodlePx = Math.round(21 * Math.min(1.1, scale));
  ctx.fillStyle = "#19334a";
  ctx.font = `700 ${doodlePx}px 'Caveat', 'Kalam', cursive`;
  ctx.fillText(page.doodle, 116, 1198, 540);

  ctx.fillStyle = "#1b140d";
  ctx.font = "700 22px 'Kalam', 'IBM Plex Mono', cursive";
  ctx.textAlign = "right";
  ctx.fillText(
    `PAGE ${String(page.pageNumber).padStart(2, "0")} / ${String(notebookPages.length).padStart(2, "0")}`,
    836,
    1198,
  );
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function StickyNote3D({
  note,
  localX,
  localZ,
  fontVersion,
  textScale,
  scrollProgress,
}: {
  note: StickyNoteItem;
  localX: number;
  localZ: number;
  fontVersion: number;
  textScale: number;
  scrollProgress: number;
}) {
  const texture = useMemo(
    () => createStickyNoteTexture(note, textScale, scrollProgress),
    [note, fontVersion, textScale, scrollProgress],
  );

  // Slightly curled sticky note plane geometry
  const stickyGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.46, 0.48, 12, 12);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      // Normalize u, v in [0, 1] where v=0 is bottom and u=1 is right
      const u = (px + 0.23) / 0.46;
      const v = 1 - (py + 0.24) / 0.48;
      // Gentle corner curl lifting toward local +Z (which faces +Y when cover opens)
      const cornerCurl = Math.pow(Math.max(0, u * 0.65 + v * 0.65 - 0.55), 2) * 0.022;
      pos.setZ(i, cornerCurl);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rotRad = (note.rotationDeg * Math.PI) / 180;

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <group position={[localX, -0.02, localZ]}>
      {/* Soft drop shadow underneath sticky note */}
      <mesh position={[-0.008, 0.001, 0.008]} rotation={[Math.PI / 2, 0, Math.PI + rotRad]}>
        <planeGeometry args={[0.465, 0.485]} />
        <meshBasicMaterial
          color="#1f150d"
          transparent
          opacity={0.22}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* Curled 3D sticky note paper */}
      <mesh
        geometry={stickyGeo}
        position={[0, -0.0025, 0]}
        rotation={[Math.PI / 2, 0, Math.PI + rotRad]}
      >
        <meshBasicMaterial map={texture} color="#f3ebdc" side={THREE.DoubleSide} />
      </mesh>

      {/* Decorative semi-transparent washi tape strip at top edge */}
      <mesh
        position={[0, -0.0055, -0.225]}
        rotation={[Math.PI / 2, 0, Math.PI + rotRad * 0.5 + 0.04]}
      >
        <planeGeometry args={[0.16, 0.044]} />
        <meshBasicMaterial
          color={note.tapeColor}
          transparent
          opacity={0.82}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  );
}

function createForeEdgeTabTexture(tab: NotebookCategoryTab, active: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 168;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = tab.color;
  ctx.fillRect(0, 0, 320, 168);

  // Paper crease shadow along left attachment edge
  const seam = ctx.createLinearGradient(0, 0, 88, 0);
  seam.addColorStop(0, "rgba(35, 25, 15, 0.36)");
  seam.addColorStop(1, "rgba(35, 25, 15, 0)");
  ctx.fillStyle = seam;
  ctx.fillRect(0, 0, 88, 168);

  // Subtle paper border
  ctx.strokeStyle = active ? "#1b1610" : "rgba(35, 28, 18, 0.35)";
  ctx.lineWidth = active ? 8 : 4;
  ctx.strokeRect(4, 4, 312, 160);

  // Printed tab label positioned in the protruding right portion so the closed cover never clips it
  ctx.fillStyle = "#1c1813";
  ctx.font = "700 30px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(tab.label, 202, 96, 206);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function ForeEdgeTabItem({
  tab,
  index,
  active,
  onSelect,
  onHoverChange,
}: {
  tab: NotebookCategoryTab;
  index: number;
  active: boolean;
  onSelect: (targetPage: number) => void;
  onHoverChange: (info: HoverInfo) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => createForeEdgeTabTexture(tab, active), [tab, active]);

  const baseX = PAGE_CENTER + PAGE_WIDTH / 2 + 0.125;
  const baseY = 0.056 - index * 0.0032;
  const baseZ = -0.665 + index * 0.19;

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetX = baseX + (hovered ? 0.032 : active ? 0.016 : 0);
    const targetY = baseY + (hovered ? 0.008 : 0);
    meshRef.current.position.x = THREE.MathUtils.damp(
      meshRef.current.position.x,
      targetX,
      8,
      delta,
    );
    meshRef.current.position.y = THREE.MathUtils.damp(
      meshRef.current.position.y,
      targetY,
      8,
      delta,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={[baseX, baseY, baseZ]}
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        onSelect(tab.targetPage);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        onHoverChange({ id: "tab", label: `TAB // ${tab.fullTitle.toUpperCase()}` });
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        onHoverChange(null);
      }}
    >
      <boxGeometry args={[0.27, 0.008, 0.155]} />
      <meshStandardMaterial map={texture} roughness={0.82} />
    </mesh>
  );
}

function TurningSheet({
  direction,
  frontTexture,
  backTexture,
}: {
  direction: 1 | -1;
  frontTexture: THREE.CanvasTexture;
  backTexture: THREE.CanvasTexture;
}) {
  const pivotRef = useRef<THREE.Group>(null);
  const frontMeshRef = useRef<THREE.Mesh>(null);
  const backMeshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  const baseGeo = useMemo(() => new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_DEPTH, 20, 1), []);
  const originalX = useMemo(() => {
    const pos = baseGeo.attributes.position;
    const arr = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      arr[i] = pos.getX(i);
    }
    return arr;
  }, [baseGeo]);

  useEffect(() => {
    progressRef.current = 0;
  }, [direction, frontTexture, backTexture]);

  useFrame((_, delta) => {
    progressRef.current = Math.min(1, progressRef.current + delta / 0.82);
    const t = THREE.MathUtils.smoothstep(progressRef.current, 0, 1);
    const angle = direction > 0 ? t * Math.PI : (1 - t) * Math.PI;
    const arch = Math.sin(t * Math.PI) * 0.095;

    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (originalX[i] + PAGE_WIDTH / 2) / PAGE_WIDTH;
      pos.setZ(i, Math.sin(u * Math.PI) * arch);
    }
    pos.needsUpdate = true;

    if (pivotRef.current) {
      pivotRef.current.rotation.z = angle;
    }
    if (frontMeshRef.current && backMeshRef.current) {
      const onRightHalf = angle <= Math.PI / 2;
      frontMeshRef.current.visible = onRightHalf;
      backMeshRef.current.visible = !onRightHalf;
    }
  });

  return (
    <group ref={pivotRef} position={[0, 0.088, 0]}>
      {/* Top surface visible during first half of turn (0..90 deg) */}
      <mesh
        ref={frontMeshRef}
        geometry={baseGeo}
        position={[PAGE_CENTER, 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        <meshBasicMaterial map={frontTexture} color="#ede4d3" />
      </mesh>
      {/* Upturned surface visible during second half of turn (90..180 deg) */}
      <mesh
        ref={backMeshRef}
        geometry={baseGeo}
        position={[PAGE_CENTER, -0.002, 0]}
        rotation={[Math.PI / 2, 0, Math.PI]}
        visible={false}
        castShadow
      >
        <meshBasicMaterial map={backTexture} color="#ede4d3" />
      </mesh>
    </group>
  );
}

export default function Notebook({
  notebookState,
  activePage,
  targetTurnPage,
  textScale = 100,
  pageScrollProgress = 0,
  onClickNotebook,
  onSelectCategoryTab,
  onHoverChange,
}: NotebookProps) {
  const rootRef = useRef<THREE.Group>(null);
  const frontCoverPivotRef = useRef<THREE.Group>(null);
  const coverProgressRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [fontVersion, setFontVersion] = useState(0);

  useEffect(() => {
    if (typeof document !== "undefined" && typeof FontFace !== "undefined" && document.fonts) {
      const faces = [
        new FontFace("Kalam", "url(/fonts/kalam-400.woff2)", { weight: "400", style: "normal" }),
        new FontFace("Kalam", "url(/fonts/kalam-700.woff2)", { weight: "700", style: "normal" }),
        new FontFace("Caveat", "url(/fonts/caveat-700.woff2)", { weight: "700", style: "normal" }),
      ];
      Promise.all([
        ...faces.map((f) =>
          f.load().then((loaded) => {
            document.fonts.add(loaded);
          }),
        ),
        document.fonts.load("400 24px Kalam"),
        document.fonts.load("700 32px Kalam"),
        document.fonts.load("700 28px Caveat"),
      ])
        .then(() => {
          setFontVersion((v) => v + 1);
        })
        .catch(() => {});
    }
  }, []);

  const coverTexture = useMemo(() => createCoverTexture(), [fontVersion]);
  const insideCoverTexture = useMemo(
    () => createInsideCoverTexture(textScale),
    [fontVersion, textScale],
  );
  const pageTextureCacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());

  const getPageTexture = useMemo(() => {
    return (oneBasedPage: number, scrollAmt = 0): THREE.CanvasTexture => {
      const idx = Math.max(0, Math.min(notebookPages.length - 1, oneBasedPage - 1));
      const scrollStep = Math.round(scrollAmt * 20);
      const key = `${idx + 1}-v${fontVersion}-s${textScale}-p${scrollStep}`;
      let tex = pageTextureCacheRef.current.get(key);
      if (!tex) {
        tex = createPageTexture(notebookPages[idx], textScale, scrollStep / 20);
        pageTextureCacheRef.current.set(key, tex);
      }
      return tex;
    };
  }, [fontVersion, textScale]);

  // Dispose old fontVersion page textures and clean up on unmount
  useEffect(() => {
    const cache = pageTextureCacheRef.current;
    for (const [key, tex] of cache.entries()) {
      if (!key.includes(`-v${fontVersion}-s${textScale}-`)) {
        tex.dispose();
        cache.delete(key);
      }
    }
  }, [fontVersion, textScale]);

  useEffect(() => {
    return () => {
      coverTexture.dispose();
      insideCoverTexture.dispose();
    };
  }, [coverTexture, insideCoverTexture]);

  useEffect(() => {
    const cache = pageTextureCacheRef.current;
    return () => {
      for (const tex of cache.values()) {
        tex.dispose();
      }
      cache.clear();
    };
  }, []);

  // Shared geometry and material for the 14 spiral binding rings
  const spiralRingGeo = useMemo(() => new THREE.TorusGeometry(0.062, 0.012, 8, 16), []);
  const spiralRingMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2f2a25", metalness: 0.78, roughness: 0.32 }),
    [],
  );
  useEffect(() => {
    return () => {
      spiralRingGeo.dispose();
      spiralRingMat.dispose();
    };
  }, [spiralRingGeo, spiralRingMat]);

  const isOpen = !["NOTEBOOK_CLOSED", "NOTEBOOK_COVER_VIEW", "NOTEBOOK_CLOSING"].includes(
    notebookState,
  );

  const showInterior =
    notebookState !== "NOTEBOOK_CLOSED" && notebookState !== "NOTEBOOK_COVER_VIEW";

  useFrame((_, delta) => {
    if (!rootRef.current || !frontCoverPivotRef.current) return;
    const baseTargetPos =
      notebookState === "NOTEBOOK_CLOSED"
        ? CLOSED_POS
        : notebookState === "NOTEBOOK_COVER_VIEW" || notebookState === "NOTEBOOK_CLOSING"
          ? COVER_VIEW_POS
          : OPEN_POS;

    const hoverLift = notebookState === "NOTEBOOK_CLOSED" && hovered ? 0.018 : 0;
    rootRef.current.position.x = THREE.MathUtils.damp(
      rootRef.current.position.x,
      baseTargetPos.x,
      5.2,
      delta,
    );
    rootRef.current.position.y = THREE.MathUtils.damp(
      rootRef.current.position.y,
      baseTargetPos.y + hoverLift,
      5.8,
      delta,
    );
    rootRef.current.position.z = THREE.MathUtils.damp(
      rootRef.current.position.z,
      baseTargetPos.z,
      5.2,
      delta,
    );

    const targetYaw = notebookState === "NOTEBOOK_CLOSED" ? 0.08 : 0;
    rootRef.current.rotation.y = THREE.MathUtils.damp(
      rootRef.current.rotation.y,
      targetYaw,
      5,
      delta,
    );

    // Deterministic smoothstep rotation for the front cover around the spine (x = 0)
    const targetProgress = isOpen ? 1 : 0;
    if (coverProgressRef.current < targetProgress) {
      coverProgressRef.current = Math.min(1, coverProgressRef.current + delta / 0.76);
    } else if (coverProgressRef.current > targetProgress) {
      coverProgressRef.current = Math.max(0, coverProgressRef.current - delta / 0.72);
    }
    const smoothCover = THREE.MathUtils.smoothstep(coverProgressRef.current, 0, 1);
    frontCoverPivotRef.current.rotation.z = smoothCover * Math.PI;
  });

  // Two-page spread indexing: each spread shows odd page (leftSpreadPage) on left and even page (leftSpreadPage + 1) on right
  const currentSpreadLeft = useMemo(() => {
    const clamped = Math.max(1, Math.min(notebookPages.length - 1, activePage));
    return clamped % 2 === 1 ? clamped : clamped - 1;
  }, [activePage]);

  const nextSpreadLeft = useMemo(() => {
    if (targetTurnPage && targetTurnPage >= 1) {
      const clamped = Math.max(1, Math.min(notebookPages.length - 1, targetTurnPage));
      return clamped % 2 === 1 ? clamped : clamped - 1;
    }
    return Math.min(notebookPages.length - 1, currentSpreadLeft + 2);
  }, [currentSpreadLeft, targetTurnPage]);

  const prevSpreadLeft = useMemo(() => {
    if (targetTurnPage && targetTurnPage >= 1) {
      const clamped = Math.max(1, Math.min(notebookPages.length - 1, targetTurnPage));
      return clamped % 2 === 1 ? clamped : clamped - 1;
    }
    return Math.max(1, currentSpreadLeft - 2);
  }, [currentSpreadLeft, targetTurnPage]);

  const isTurningForward = notebookState === "NOTEBOOK_PAGE_TURNING_FORWARD";
  const isTurningBackward = notebookState === "NOTEBOOK_PAGE_TURNING_BACKWARD";

  const leftStaticTexture = useMemo(() => {
    if (isTurningBackward) {
      return getPageTexture(prevSpreadLeft, 0);
    }
    return getPageTexture(currentSpreadLeft, pageScrollProgress);
  }, [currentSpreadLeft, prevSpreadLeft, isTurningBackward, getPageTexture, pageScrollProgress]);

  const rightStaticTexture = useMemo(() => {
    if (isTurningForward) {
      return getPageTexture(Math.min(notebookPages.length, nextSpreadLeft + 1), 0);
    }
    return getPageTexture(
      Math.min(notebookPages.length, currentSpreadLeft + 1),
      pageScrollProgress,
    );
  }, [currentSpreadLeft, nextSpreadLeft, isTurningForward, getPageTexture, pageScrollProgress]);

  const turningFrontTexture = useMemo(() => {
    if (isTurningForward) {
      return getPageTexture(Math.min(notebookPages.length, currentSpreadLeft + 1));
    }
    return getPageTexture(Math.min(notebookPages.length, prevSpreadLeft + 1));
  }, [currentSpreadLeft, prevSpreadLeft, isTurningForward, getPageTexture]);

  const turningBackTexture = useMemo(() => {
    if (isTurningForward) {
      return getPageTexture(nextSpreadLeft);
    }
    return getPageTexture(currentSpreadLeft);
  }, [currentSpreadLeft, nextSpreadLeft, isTurningForward, getPageTexture]);

  // Left page stack is only present when a spread >= 3 rests on the left side.
  // On Spread 1 (Pages 01-02), the left page IS the opened Inside Front Cover with its 3D Sticky Notes.
  const leftStackPageNumber = isTurningBackward ? prevSpreadLeft : currentSpreadLeft;
  const showLeftPageStack =
    showInterior &&
    notebookState !== "NOTEBOOK_OPENING" &&
    notebookState !== "NOTEBOOK_CLOSING" &&
    leftStackPageNumber >= 3;

  const activeCategoryId = notebookPages[currentSpreadLeft - 1]?.categoryId ?? "profile";

  return (
    <group
      ref={rootRef}
      position={CLOSED_POS}
      rotation={[0, 0.08, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onClickNotebook();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        if (notebookState === "NOTEBOOK_CLOSED") {
          onHoverChange({ id: "notebook", label: "OPEN LITERARY NOTEBOOK" });
        }
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        onHoverChange(null);
      }}
    >
      {/* Soft ground contact shadow under notebook */}
      <mesh position={[COVER_CENTER, -0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COVER_WIDTH + 0.04, COVER_DEPTH + 0.04]} />
        <meshBasicMaterial
          color="#120804"
          transparent
          opacity={0.24}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* Back Cover */}
      <RoundedBox
        position={[COVER_CENTER, 0, 0]}
        args={[COVER_WIDTH, 0.045, COVER_DEPTH]}
        radius={0.02}
        smoothness={2}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#5d3222" roughness={0.82} />
      </RoundedBox>

      {/* Right Page Stack (always fits inside back cover) */}
      <RoundedBox
        position={[PAGE_CENTER, 0.042, 0]}
        args={[PAGE_WIDTH, 0.042, PAGE_DEPTH]}
        radius={0.012}
        smoothness={2}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#e8dec0" roughness={0.92} />
      </RoundedBox>
      {showInterior && (
        <mesh position={[PAGE_CENTER, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PAGE_WIDTH - 0.01, PAGE_DEPTH - 0.01]} />
          <meshBasicMaterial map={rightStaticTexture} color="#ebe2d2" />
        </mesh>
      )}

      {/* Left Page Stack (visible when cover opens) */}
      {showLeftPageStack && (
        <group position={[-PAGE_CENTER, 0.048, 0]}>
          <RoundedBox
            args={[PAGE_WIDTH, 0.036, PAGE_DEPTH]}
            radius={0.012}
            smoothness={2}
            receiveShadow
          >
            <meshStandardMaterial color="#e3d8b8" roughness={0.92} />
          </RoundedBox>
          <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PAGE_WIDTH - 0.01, PAGE_DEPTH - 0.01]} />
            <meshBasicMaterial map={leftStaticTexture} color="#efe7d7" />
          </mesh>
        </group>
      )}

      {/* Animated Turning Page */}
      {(isTurningForward || isTurningBackward) && (
        <TurningSheet
          direction={isTurningForward ? 1 : -1}
          frontTexture={turningFrontTexture}
          backTexture={turningBackTexture}
        />
      )}

      {/* Physical Colored Paper Fore-Edge Indexing Tabs along the Right Edge */}
      {notebookCategories.map((tab, index) => (
        <ForeEdgeTabItem
          key={tab.id}
          tab={tab}
          index={index}
          active={activeCategoryId === tab.id}
          onSelect={onSelectCategoryTab}
          onHoverChange={onHoverChange}
        />
      ))}

      {/* Front Cover (Pivoted at x = 0 Spiral Binding Edge) */}
      <group ref={frontCoverPivotRef} position={[0, 0.044, 0]}>
        <group position={[COVER_CENTER, 0.032, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[COVER_WIDTH, 0.032, COVER_DEPTH]} />
            <meshStandardMaterial color="#cbb98f" roughness={0.84} />
          </mesh>
          {/* Outer Front Cover Artwork (visible when closed) */}
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[COVER_WIDTH - 0.02, COVER_DEPTH - 0.02]} />
            <meshStandardMaterial
              map={coverTexture}
              roughness={0.82}
              color={hovered && notebookState === "NOTEBOOK_CLOSED" ? "#fff8e8" : "#ffffff"}
            />
          </mesh>
          {/* Inner Front Cover Surface (right-side-up on the left page when cover opens) */}
          <mesh position={[0, -0.018, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
            <planeGeometry args={[PAGE_WIDTH - 0.01, PAGE_DEPTH - 0.01]} />
            <meshBasicMaterial map={insideCoverTexture} color="#efe7d7" />
          </mesh>

          {/* 3D Physical Introduction Sticky Notes attached to the Inside Front Cover */}
          {!showLeftPageStack && (
            <group>
              <StickyNote3D
                note={introStickyNotes[0]}
                localX={0.27}
                localZ={-0.38}
                fontVersion={fontVersion}
                textScale={textScale}
                scrollProgress={pageScrollProgress}
              />
              <StickyNote3D
                note={introStickyNotes[1]}
                localX={-0.25}
                localZ={-0.36}
                fontVersion={fontVersion}
                textScale={textScale}
                scrollProgress={pageScrollProgress}
              />
              <StickyNote3D
                note={introStickyNotes[2]}
                localX={0.26}
                localZ={0.18}
                fontVersion={fontVersion}
                textScale={textScale}
                scrollProgress={pageScrollProgress}
              />
              <StickyNote3D
                note={introStickyNotes[3]}
                localX={-0.25}
                localZ={0.2}
                fontVersion={fontVersion}
                textScale={textScale}
                scrollProgress={pageScrollProgress}
              />
            </group>
          )}
        </group>
      </group>

      {/* Spiral Wire Binding Rings along the left spine edge (x = 0) */}
      {Array.from({ length: 14 }, (_, index) => (
        <mesh
          key={index}
          geometry={spiralRingGeo}
          material={spiralRingMat}
          position={[0, 0.055, -0.78 + index * 0.12]}
          rotation={[0, 0, Math.PI / 2]}
        />
      ))}
    </group>
  );
}
