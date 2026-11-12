import { QuadraticBezierLine, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import DVDSystem, { DriveTray } from "./DVDSystem";
import Notebook from "./Notebook";
import StudentID from "./StudentID";
import { projects, type Project } from "./data";
import {
  DESK_TOP,
  type CRTState,
  type DVDState,
  type HoverInfo,
  type NotebookState,
  type ThemeMode,
  type View,
} from "./interaction";

type SceneProps = {
  view: View;
  theme: ThemeMode;
  phase: DVDState;
  crtState: CRTState;
  phaseDurationMs: number;
  lampOn: boolean;
  blindsOpen: boolean;
  selected: number | null;
  notebookState: NotebookState;
  notebookPage: number;
  targetTurnPage?: number | null;
  notebookTextScale?: number;
  notebookPageScroll?: number;
  qualityTier?: "high" | "balanced" | "mobile";
  onSceneReady?: () => void;
  crtPortalRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (index: number) => void;
  onPlay: () => void;
  onToggleVideoPause: () => void;
  onClickNotebook: () => void;
  onScrollNotebook: (direction: 1 | -1) => void;
  onSelectCategoryTab: (targetPage: number) => void;
  onClickStudentID: () => void;
  onToggleLamp: () => void;
  onToggleWindowView: () => void;
  onToggleBlinds: () => void;
  onToggleScreenZoom: () => void;
  onTogglePower: () => void;
  onHoverChange: (info: HoverInfo) => void;
};

const beige = "#a9a392";
const darkBeige = "#777265";

function CameraRig({ view, notebookState }: { view: View; notebookState: NotebookState }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useRef(new THREE.Vector3(0, 2.15, 0));

  useFrame((state, delta) => {
    const vw = Math.max(1, state.size.width);
    const vh = Math.max(1, state.size.height);
    const aspect = vw / vh;
    const isMobileLandscape = vh < 540 && aspect >= 1.15;
    // Smoothly pull back camera when viewport aspect ratio is narrower than standard desktop (1.42)
    const fitScale = aspect < 1.42 ? Math.min(2.45, Math.max(1, 1.42 / Math.max(0.46, aspect))) : 1;
    const landscapePullback = isMobileLandscape ? 1.07 : 1;
    const zoomOut = Math.max(fitScale, landscapePullback);

    if (view === "screen") {
      desired.set(0, 3.16, 4.45 + (zoomOut - 1) * 1.35);
      target.set(0, 3.1, 0.2);
    } else if (view === "window") {
      desired.set(4.5, 4.25, 4.5 + (zoomOut - 1) * 1.2);
      target.set(3.6, 4.1, -2.2);
    } else if (view === "studentId") {
      // Readable angle that avoids placing desk lamp reflection over the printed ID
      desired.set(-2.72, 2.24 + (zoomOut - 1) * 0.34, 2.06 + (zoomOut - 1) * 0.38);
      target.set(-2.72, DESK_TOP + 0.34, 1.4);
    } else if (view === "notebook") {
      const coverStage =
        notebookState === "NOTEBOOK_COVER_VIEW" ||
        notebookState === "NOTEBOOK_CLOSING" ||
        notebookState === "NOTEBOOK_CLOSED";
      if (coverStage) {
        // Stage 1: Focus on closed notebook cover
        desired.set(-4.08, 3.52 + (zoomOut - 1) * 0.45, 2.28 + (zoomOut - 1) * 0.35);
        target.set(-4.08, DESK_TOP + 0.06, 1.72);
      } else {
        // Stage 2 & 3: Focus centered above the open two-page spread
        desired.set(-4.66, 3.98 + (zoomOut - 1) * 0.72, 2.32 + (zoomOut - 1) * 0.48);
        target.set(-4.66, DESK_TOP + 0.06, 1.74);
      }
    } else {
      const pointerFactor = isMobileLandscape || aspect < 1.1 ? 0.06 : 0.15;
      desired.set(
        state.pointer.x * pointerFactor,
        4.35 + (zoomOut - 1) * 0.55 + state.pointer.y * (pointerFactor * 0.42),
        9.6 * zoomOut,
      );
      target.set(0, isMobileLandscape ? 2.08 : 2.15, 0);
    }
    const posAlpha = 1 - Math.exp(-delta * 3.4);
    const lookAlpha = 1 - Math.exp(-delta * 4.2);
    camera.position.lerp(desired, posAlpha);
    lookAt.current.lerp(target, lookAlpha);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt.current);
  });
  return null;
}

function City({
  theme,
  qualityTier = "high",
}: {
  theme: ThemeMode;
  qualityTier?: "high" | "balanced" | "mobile";
}) {
  const isDay = theme === "day";
  const rainCount = qualityTier === "mobile" ? 22 : qualityTier === "balanced" ? 32 : 45;
  const rain = useMemo(
    () =>
      Array.from({ length: rainCount }, (_, i) => ({
        x: -6 + ((i * 73) % 120) / 10,
        y: 1.7 + ((i * 47) % 57) / 10,
        h: 0.05 + ((i * 13) % 14) / 100,
      })),
    [rainCount],
  );
  return (
    <group position={[0, 0, -2.8]}>
      <mesh position={[0, 4.25, -0.24]}>
        <planeGeometry args={[13, 6]} />
        <meshBasicMaterial color={isDay ? "#8fc1e2" : "#0d1f30"} />
      </mesh>
      {isDay && (
        <mesh position={[2.8, 5.1, -0.16]}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial color="#fff6d6" />
        </mesh>
      )}
      {[-5, -3.65, -2.25, -0.6, 1.1, 2.8, 4.7].map((x, i) => (
        <group key={x} position={[x, 2.1, i % 2 === 0 ? 0 : -0.05]}>
          <mesh position={[0, 1.2 + (i % 3) * 0.3, 0]}>
            <boxGeometry args={[1.05 + (i % 2) * 0.35, 3.6 + (i % 3) * 0.7, 0.12]} />
            <meshBasicMaterial
              color={isDay ? (i % 2 ? "#5e7488" : "#4d6377") : i % 2 ? "#15293d" : "#162332"}
            />
          </mesh>
          {Array.from({ length: 15 }, (_, j) => (
            <mesh
              key={j}
              position={[-0.32 + (j % 3) * 0.32, 0.2 + Math.floor(j / 3) * 0.55, 0.072]}
            >
              <planeGeometry args={[0.1, 0.07]} />
              <meshBasicMaterial
                color={
                  isDay
                    ? j % 3 === 0
                      ? "#d8eefc"
                      : "#9ab9cf"
                    : j % 4 === i % 4
                      ? "#ffd078"
                      : "#5a829c"
                }
                transparent
                opacity={isDay ? 0.65 : 0.82}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-1}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.05, 0.16]} rotation={[0, 0, -0.035]}>
        <planeGeometry args={[13, 0.16]} />
        <meshBasicMaterial color={isDay ? "#d9c398" : "#e1a349"} />
      </mesh>
      {!isDay &&
        rain.map((drop, i) => (
          <mesh key={i} position={[drop.x, drop.y, 0.34]} rotation={[0, 0, -0.17]}>
            <planeGeometry args={[0.012, drop.h]} />
            <meshBasicMaterial color="#9bc0d1" transparent opacity={0.38} depthWrite={false} />
          </mesh>
        ))}
    </group>
  );
}

function Window({
  open,
  theme,
  qualityTier,
  onToggleWindowView,
  onToggleBlinds,
  onHoverChange,
}: {
  open: boolean;
  theme: ThemeMode;
  qualityTier?: "high" | "balanced" | "mobile";
  onToggleWindowView: () => void;
  onToggleBlinds: () => void;
  onHoverChange: (info: HoverInfo) => void;
}) {
  const blinds = useRef<THREE.Group>(null);
  const [blindsHovered, setBlindsHovered] = useState(false);
  useFrame((_, delta) => {
    if (!blinds.current) return;
    blinds.current.position.y = THREE.MathUtils.damp(
      blinds.current.position.y,
      open ? 6.5 : 4.95,
      3,
      delta,
    );
    blinds.current.scale.y = THREE.MathUtils.damp(
      blinds.current.scale.y,
      open ? 0.24 : 1,
      3,
      delta,
    );
  });
  return (
    <group>
      <City theme={theme} qualityTier={qualityTier} />
      {/* Interactive window glass area */}
      <mesh
        position={[0, 3.05, -2.35]}
        onClick={(e) => {
          e.stopPropagation();
          onToggleWindowView();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange({ id: "window", label: "EXPLORE CITY WINDOW" });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(null);
        }}
      >
        <planeGeometry args={[12.2, 3.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 4.4, -2.32]}>
        <boxGeometry args={[12.4, 0.18, 0.22]} />
        <meshStandardMaterial color="#2c160e" roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.45, -2.28]}>
        <boxGeometry args={[12.4, 0.28, 0.36]} />
        <meshStandardMaterial color="#35180d" roughness={0.4} />
      </mesh>
      {[-6.1, 0, 6.1].map((x) => (
        <mesh key={x} position={[x, 2.95, -2.24]}>
          <boxGeometry args={[0.25, 2.72, 0.28]} />
          <meshStandardMaterial color="#2e160d" />
        </mesh>
      ))}
      <group
        ref={blinds}
        position={[0, 4.95, -2.02]}
        onClick={(e) => {
          e.stopPropagation();
          onToggleBlinds();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setBlindsHovered(true);
          onHoverChange({ id: "blinds", label: "OPEN OR CLOSE WINDOW BLINDS" });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setBlindsHovered(false);
          onHoverChange(null);
        }}
      >
        {Array.from({ length: 13 }, (_, i) => (
          <mesh key={i} position={[0, -i * 0.24, 0]}>
            <boxGeometry args={[12.1, 0.16, 0.1]} />
            <meshStandardMaterial color={blindsHovered ? "#633b28" : "#4b2b1c"} roughness={0.72} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Lamp({
  on,
  onToggleLamp,
  onHoverChange,
}: {
  on: boolean;
  onToggleLamp: () => void;
  onHoverChange: (info: HoverInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={[-3.9, DESK_TOP + 0.07, -0.2]}
      onClick={(e) => {
        e.stopPropagation();
        onToggleLamp();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHoverChange({ id: "lamp", label: "TOGGLE BANKER LAMP" });
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHoverChange(null);
      }}
    >
      {/* Contact shadow under banker lamp base */}
      <mesh position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.92, 32]} />
        <meshBasicMaterial
          color="#120804"
          transparent
          opacity={0.42}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.68, 0.8, 0.14, 32]} />
        <meshStandardMaterial
          color={hovered ? "#8c622e" : "#765024"}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 2.2, 20]} />
        <meshStandardMaterial color="#9d7535" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.92, 0.7, 0.52, 32]} />
        <meshStandardMaterial
          color={on ? (hovered ? "#1e9156" : "#167b47") : hovered ? "#214f3b" : "#173d2d"}
          emissive={on ? "#145732" : "#05120b"}
          emissiveIntensity={on ? 0.55 : 0.1}
          roughness={0.28}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 1.84, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.04, 32]} />
        <meshBasicMaterial color={on ? "#ffe6af" : "#18201b"} />
      </mesh>
      {on && (
        <>
          <pointLight
            position={[0.42, 1.58, -0.32]}
            color="#ffca7a"
            intensity={18}
            distance={9.5}
            decay={1.9}
          />
        </>
      )}
    </group>
  );
}

function Keyboard() {
  const centerY = DESK_TOP + 0.13;
  return (
    <group position={[0, centerY, 2.18]} rotation={[-0.04, 0, 0]}>
      <RoundedBox args={[4.6, 0.24, 1.22]} radius={0.08} smoothness={3} castShadow>
        <meshStandardMaterial color="#aaa493" roughness={0.7} />
      </RoundedBox>
      {Array.from({ length: 52 }, (_, i) => {
        const row = Math.floor(i / 13);
        const col = i % 13;
        return (
          <mesh key={i} position={[-1.88 + col * 0.3, 0.145, -0.35 + row * 0.23]}>
            <boxGeometry args={[i === 48 ? 1.25 : 0.24, 0.07, 0.17]} />
            <meshStandardMaterial color="#c1bcaa" roughness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

function CRTScreen({
  phase,
  crtState,
  phaseDurationMs,
  project,
  crtPortalRef,
  onPlay,
  onToggleVideoPause,
}: {
  phase: DVDState;
  crtState: CRTState;
  phaseDurationMs: number;
  project?: Project;
  crtPortalRef: React.RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  onToggleVideoPause: () => void;
}) {
  const phaseElapsedRef = useRef(0);
  const lastDrawKeyRef = useRef("");
  const lastPortalBoxRef = useRef("");
  const topLeftCorner = useMemo(() => new THREE.Vector3(), []);
  const bottomRightCorner = useMemo(() => new THREE.Vector3(), []);

  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 440;
    const context = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useEffect(() => {
    phaseElapsedRef.current = 0;
    lastDrawKeyRef.current = "";
  }, [phase, crtState, project]);

  useFrame((state, delta) => {
    phaseElapsedRef.current += delta * 1000;

    // Project 3D CRT inner screen world bounds [-1.31..1.31, 2.205..3.995, 1.015] to DOM portal
    const portalEl = crtPortalRef.current;
    if (portalEl) {
      topLeftCorner.set(-1.31, 3.995, 1.015).project(state.camera);
      bottomRightCorner.set(1.31, 2.205, 1.015).project(state.camera);
      const vw = state.size.width;
      const vh = state.size.height;
      const left = (topLeftCorner.x + 1) * 0.5 * vw;
      const top = (1 - topLeftCorner.y) * 0.5 * vh;
      const right = (bottomRightCorner.x + 1) * 0.5 * vw;
      const bottom = (1 - bottomRightCorner.y) * 0.5 * vh;
      const boxW = Math.max(0, right - left);
      const boxH = Math.max(0, bottom - top);
      const boxKey = `${left.toFixed(1)},${top.toFixed(1)},${boxW.toFixed(1)},${boxH.toFixed(1)}`;
      if (boxKey !== lastPortalBoxRef.current) {
        lastPortalBoxRef.current = boxKey;
        portalEl.style.left = `${left.toFixed(1)}px`;
        portalEl.style.top = `${top.toFixed(1)}px`;
        portalEl.style.width = `${boxW.toFixed(1)}px`;
        portalEl.style.height = `${boxH.toFixed(1)}px`;
      }
    }

    const isLoadingState =
      phase === "PROJECT_LOADING" ||
      crtState === "READING_DISC" ||
      crtState === "CONNECTING_TO_YOUTUBE" ||
      crtState === "VIDEO_LOADING";
    const bootStep =
      phase === "STARTUP"
        ? `${Math.min(28, Math.floor((phaseElapsedRef.current / Math.max(1, phaseDurationMs)) * 28))}-${Math.floor(state.clock.elapsedTime * 2) % 2}`
        : "";
    const loadPct = isLoadingState
      ? Math.min(98, Math.max(12, Math.round((phaseElapsedRef.current / 1800) * 100)))
      : 0;
    const drawKey = `${phase}|${crtState}|${project?.id ?? ""}|${bootStep}|${loadPct}`;
    if (drawKey === lastDrawKeyRef.current) {
      return;
    }
    lastDrawKeyRef.current = drawKey;

    const w = canvas.width;
    const h = canvas.height;

    if (phase === "OFF") {
      ctx.fillStyle = "#06090a";
      ctx.fillRect(0, 0, w, h);
      texture.needsUpdate = true;
      return;
    }

    // CRT phosphor background gradient
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 30, w * 0.5, h * 0.5, w * 0.65);
    bg.addColorStop(0, "#1d323b");
    bg.addColorStop(0.68, "#0f1b21");
    bg.addColorStop(1, "#060b0e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Outer CRT frame lines
    ctx.strokeStyle = "rgba(158, 224, 210, 0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 22, w - 48, h - 44);

    const drawTopBar = (left: string, right: string) => {
      ctx.fillStyle = "rgba(158, 224, 210, 0.12)";
      ctx.fillRect(26, 24, w - 52, 36);
      ctx.fillStyle = "#a9ddd2";
      ctx.font = "600 16px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(left, 42, 48);
      ctx.textAlign = "right";
      ctx.fillText(right, w - 42, 48);
      ctx.textAlign = "left";
    };

    if (phase === "STARTUP") {
      drawTopBar("MVD/OS 95 // SYSTEM BOOT", "640K OK");
      ctx.fillStyle = "#dff6f0";
      ctx.font = "700 44px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("MY VIRTUAL DESK", w / 2, 185, 560);

      ctx.fillStyle = "#8ec7bc";
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
      ctx.fillText("INTERACTIVE WORKSTATION ENVIRONMENT", w / 2, 224);

      const bootPct = Math.min(1, phaseElapsedRef.current / Math.max(1, phaseDurationMs));
      ctx.strokeStyle = "#6aa59b";
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 268, 280, 22);
      ctx.fillStyle = "#9fe8d7";
      ctx.fillRect(184, 272, Math.floor(272 * bootPct), 14);

      if (Math.floor(state.clock.elapsedTime * 2) % 2 === 0) {
        ctx.fillStyle = "#d9f2ec";
        ctx.font = "700 18px 'IBM Plex Mono', monospace";
        ctx.fillText("[ PLAY ]", w / 2, 348);
      }
      ctx.textAlign = "left";
    } else if (phase === "DISC_READING") {
      // STATE 1 — DISC DETECTED
      drawTopBar("MY VIRTUAL DESK", project?.id ?? "OPTICAL DRIVE");
      ctx.textAlign = "center";
      ctx.fillStyle = "#8ec7bc";
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
      ctx.fillText("MY VIRTUAL DESK SYSTEM", w / 2, 152);

      ctx.fillStyle = "#e6faf5";
      ctx.font = "700 46px 'Space Mono', monospace";
      ctx.fillText("DISC DETECTED", w / 2, 214);

      ctx.fillStyle = project?.accent ?? "#9fe8d7";
      ctx.font = "600 22px 'IBM Plex Mono', monospace";
      ctx.fillText("Reading optical media...", w / 2, 268);

      ctx.fillStyle = "#9abdb6";
      ctx.font = "500 16px 'IBM Plex Mono', monospace";
      ctx.fillText(`VOLUME: ${project?.title ?? "BOOK"} (${project?.author ?? ""})`, w / 2, 336);
      ctx.textAlign = "left";
    } else if (
      phase === "PROJECT_LOADING" ||
      crtState === "READING_DISC" ||
      crtState === "CONNECTING_TO_YOUTUBE" ||
      crtState === "VIDEO_LOADING"
    ) {
      const pct = loadPct;
      drawTopBar("MY VIRTUAL DESK OPTICAL LOADER", `${pct}%`);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e6faf5";
      ctx.font = "700 34px 'Space Mono', monospace";
      ctx.fillText(
        crtState === "CONNECTING_TO_YOUTUBE"
          ? "CONNECTING TO VIDEO SOURCE..."
          : "READING VIDEO SOURCE",
        w / 2,
        168,
      );

      ctx.fillStyle = "#9fd8cb";
      ctx.font = "600 20px 'IBM Plex Mono', monospace";
      ctx.fillText(`${project?.title ?? "Great Books"} — ${project?.author ?? ""}`, w / 2, 214);

      const barX = 120;
      const barY = 256;
      const barW = 400;
      const barH = 30;
      ctx.strokeStyle = "#8bc4b8";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(barX, barY, barW, barH);

      const totalBlocks = 16;
      const activeBlocks = Math.round((pct / 100) * totalBlocks);
      for (let b = 0; b < activeBlocks; b++) {
        ctx.fillStyle = project?.accent ?? "#9fe8d7";
        ctx.fillRect(barX + 6 + b * 24.4, barY + 6, 20, barH - 12);
      }

      ctx.fillStyle = "#dff6f0";
      ctx.font = "700 22px 'IBM Plex Mono', monospace";
      ctx.fillText(`${pct}%`, w / 2, 326);

      ctx.fillStyle = "#7da39b";
      ctx.font = "500 15px 'IBM Plex Mono', monospace";
      ctx.fillText(`YOUTUBE ID: ${project?.youtubeVideoId ?? ""}`, w / 2, 368);
      ctx.textAlign = "left";
    } else if ((phase === "PROJECT_READY" || phase === "PROJECT_PLAYING") && project) {
      drawTopBar(`${project.id} // ${project.title.toUpperCase()}`, crtState.replace(/_/g, " "));
      ctx.textAlign = "center";
      ctx.fillStyle = project.accent;
      ctx.font = "700 18px 'IBM Plex Mono', monospace";
      ctx.fillText(`AUTHOR: ${project.author.toUpperCase()}`, w / 2, 144);

      ctx.fillStyle = "#f2faf8";
      ctx.font = "700 34px 'Space Mono', monospace";
      ctx.fillText(project.title, w / 2, 204, 540);

      ctx.fillStyle = project.accent;
      ctx.fillRect(w / 2 - 70, 228, 140, 4);

      const statusMsg =
        crtState === "VIDEO_READY"
          ? "VIDEO READY — PRESS PLAY"
          : crtState === "VIDEO_BUFFERING"
            ? "BUFFERING VIDEO..."
            : crtState === "VIDEO_PAUSED"
              ? "VIDEO PAUSED"
              : crtState === "VIDEO_ENDED"
                ? "VIDEO ENDED"
                : crtState === "EMBEDDING_DISABLED"
                  ? "THIS VIDEO CANNOT BE PLAYED HERE"
                  : crtState === "VIDEO_UNAVAILABLE"
                    ? "UNABLE TO PLAY THIS VIDEO"
                    : crtState === "CONNECTION_ERROR"
                      ? "CHECK YOUR INTERNET CONNECTION"
                      : "YOUTUBE VIDEO ACTIVE";

      ctx.fillStyle = "#dff6f0";
      ctx.font = "700 22px 'IBM Plex Mono', monospace";
      ctx.fillText(statusMsg, w / 2, 286);

      ctx.fillStyle = "#8ec7bc";
      ctx.font = "500 15px 'IBM Plex Mono', monospace";
      ctx.fillText(project.embedUrl, w / 2, 344);
      ctx.textAlign = "left";
    } else if (
      ["DRIVE_EJECTING", "DISC_RETURNING", "CASE_CLOSING", "RETURNING_TO_STACK"].includes(phase)
    ) {
      drawTopBar("MY VIRTUAL DESK", "EJECT");
      ctx.textAlign = "center";
      ctx.fillStyle = "#e6faf5";
      ctx.font = "700 38px 'Space Mono', monospace";
      ctx.fillText("EJECTING DISC", w / 2, 204);
      ctx.fillStyle = "#9fd8cb";
      ctx.font = "600 20px 'IBM Plex Mono', monospace";
      ctx.fillText(`Returning ${project?.title ?? "disc"} to stack...`, w / 2, 256);
      ctx.textAlign = "left";
    } else if (
      [
        "DVD_SELECTED",
        "CASE_OPENING",
        "CASE_OPEN",
        "DISC_REMOVING",
        "DRIVE_OPENING",
        "DISC_INSERTING",
      ].includes(phase)
    ) {
      drawTopBar("MY VIRTUAL DESK", project?.id ?? "OPTICAL DRIVE");
      ctx.textAlign = "center";
      ctx.fillStyle = project?.accent ?? "#9fe8d7";
      ctx.font = "700 20px 'IBM Plex Mono', monospace";
      ctx.fillText(`SELECTED: ${project?.id} — ${project?.title}`, w / 2, 168);
      ctx.fillStyle = "#e6faf5";
      ctx.font = "700 34px 'Space Mono', monospace";
      ctx.fillText("INSERTING OPTICAL MEDIA", w / 2, 224);
      ctx.fillStyle = "#9fd8cb";
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
      ctx.fillText("Opening drive tray & aligning disc...", w / 2, 272);
      ctx.textAlign = "left";
    } else {
      // IDLE desktop ready screen
      drawTopBar("MY VIRTUAL DESK — READY", "07 VOLUMES");
      ctx.textAlign = "center";
      ctx.fillStyle = "#e6faf5";
      ctx.font = "700 44px 'Space Mono', monospace";
      ctx.fillText("SELECT A DISC", w / 2, 198);

      ctx.fillStyle = "#9ecbc0";
      ctx.font = "600 19px 'IBM Plex Mono', monospace";
      ctx.fillText("Click a DVD case on the right stack to load", w / 2, 246);

      ctx.fillStyle = "#7da39b";
      ctx.font = "600 16px 'IBM Plex Mono', monospace";
      ctx.fillText("7 VOLUMES AVAILABLE  •  NOTEBOOK ON LEFT", w / 2, 344);
      ctx.textAlign = "left";
    }

    // Subtle CRT scanlines and glass vignette
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    texture.needsUpdate = true;
  });

  return (
    <mesh
      position={[0, -0.02, 0.865]}
      onClick={(event) => {
        event.stopPropagation();
        if (phase === "STARTUP") {
          onPlay();
        } else if (phase === "PROJECT_PLAYING") {
          onToggleVideoPause();
        }
      }}
    >
      <planeGeometry args={[2.62, 1.79]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Computer({
  phase,
  crtState,
  phaseDurationMs,
  project,
  trayRef,
  crtPortalRef,
  onPlay,
  onToggleVideoPause,
  onToggleScreenZoom,
  onTogglePower,
  onHoverChange,
}: {
  phase: DVDState;
  crtState: CRTState;
  phaseDurationMs: number;
  project?: Project;
  trayRef: React.RefObject<THREE.Group | null>;
  crtPortalRef: React.RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  onToggleVideoPause: () => void;
  onToggleScreenZoom: () => void;
  onTogglePower: () => void;
  onHoverChange: (info: HoverInfo) => void;
}) {
  const baseHeight = 0.82;
  const baseCenterY = DESK_TOP + baseHeight / 2;
  const [monitorHovered, setMonitorHovered] = useState(false);
  const [powerHovered, setPowerHovered] = useState(false);
  return (
    <group>
      {/* Contact shadow under computer tower */}
      <mesh position={[0, DESK_TOP + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.9, 2.65]} />
        <meshBasicMaterial color="#120804" transparent opacity={0.46} />
      </mesh>
      <group position={[0, baseCenterY, 0]}>
        <RoundedBox args={[4.55, baseHeight, 2.35]} radius={0.12} smoothness={4} castShadow>
          <meshStandardMaterial color={beige} roughness={0.58} metalness={0.05} />
        </RoundedBox>
        <mesh position={[0.55, 0.02, 1.19]}>
          <boxGeometry args={[1.42, 0.12, 0.03]} />
          <meshStandardMaterial color="#312e29" />
        </mesh>
        {/* Interactive Computer Power Button */}
        <mesh
          position={[-1.9, 0.05, 1.2]}
          scale={powerHovered ? 1.3 : 1}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePower();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setPowerHovered(true);
            onHoverChange({ id: "power", label: "TOGGLE COMPUTER POWER" });
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setPowerHovered(false);
            onHoverChange(null);
          }}
        >
          <circleGeometry args={[0.055, 20]} />
          <meshBasicMaterial
            color={phase === "OFF" ? (powerHovered ? "#457a58" : "#183524") : "#69ff88"}
          />
        </mesh>
        {Array.from({ length: 20 }, (_, i) => (
          <mesh
            key={i}
            position={[-1.65 + (i % 10) * 0.16, 0.42, -0.1 + Math.floor(i / 10) * 0.25]}
          >
            <boxGeometry args={[0.08, 0.02, 0.17]} />
            <meshStandardMaterial color="#514f47" />
          </mesh>
        ))}
      </group>
      <DriveTray trayRef={trayRef} />
      <group
        position={[0, 3.12, 0.15]}
        onClick={(e) => {
          e.stopPropagation();
          onToggleScreenZoom();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setMonitorHovered(true);
          onHoverChange({ id: "computer", label: "VIEW COMPUTER SCREEN" });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setMonitorHovered(false);
          onHoverChange(null);
        }}
      >
        <mesh position={[0, -1.01, -0.08]}>
          <cylinderGeometry args={[0.5, 0.65, 0.28, 32]} />
          <meshStandardMaterial color={darkBeige} />
        </mesh>
        <RoundedBox args={[3.55, 2.75, 1.55]} radius={0.22} smoothness={5} castShadow>
          <meshStandardMaterial
            color={monitorHovered ? "#b5afa0" : beige}
            roughness={0.56}
            metalness={0.06}
          />
        </RoundedBox>
        <RoundedBox
          position={[0, -0.02, 0.79]}
          args={[2.96, 2.13, 0.12]}
          radius={0.18}
          smoothness={5}
        >
          <meshStandardMaterial color="#32352f" roughness={0.3} />
        </RoundedBox>
        <CRTScreen
          phase={phase}
          crtState={crtState}
          phaseDurationMs={phaseDurationMs}
          project={project}
          crtPortalRef={crtPortalRef}
          onPlay={onPlay}
          onToggleVideoPause={onToggleVideoPause}
        />
      </group>
      <Keyboard />
      <group position={[2.72, DESK_TOP + 0.035, 2.15]}>
        <mesh>
          <boxGeometry args={[1.38, 0.06, 1.25]} />
          <meshStandardMaterial color="#172138" roughness={0.8} />
        </mesh>
        <RoundedBox
          position={[0, 0.18, 0]}
          args={[0.62, 0.3, 0.88]}
          radius={0.15}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial color="#a8a392" />
        </RoundedBox>
      </group>
      <QuadraticBezierLine
        start={[2.72, DESK_TOP + 0.08, 1.55]}
        mid={[2.65, DESK_TOP + 0.1, 0.7]}
        end={[2.15, baseCenterY, 0.2]}
        color="#302a22"
        lineWidth={2}
      />
      <QuadraticBezierLine
        start={[-2.0, DESK_TOP + 0.11, 2.1]}
        mid={[-2.7, DESK_TOP + 0.1, 1.4]}
        end={[-2.1, baseCenterY, 0.1]}
        color="#373127"
        lineWidth={2}
      />
    </group>
  );
}

function DeskScene(props: SceneProps) {
  const project = props.selected === null ? undefined : projects[props.selected];
  const trayRef = useRef<THREE.Group | null>(null);
  const isDay = props.theme === "day";
  const qualityTier = props.qualityTier ?? "high";
  const shadowMapSize = qualityTier === "mobile" ? 512 : 1024;
  const readyCalledRef = useRef(false);

  useFrame(() => {
    if (!readyCalledRef.current) {
      readyCalledRef.current = true;
      props.onSceneReady?.();
    }
  });

  return (
    <>
      <color attach="background" args={[isDay ? "#7fa6c4" : "#0d1116"]} />
      <fog attach="fog" args={[isDay ? "#9ab8cf" : "#0e1318", 12, 26]} />
      <CameraRig view={props.view} notebookState={props.notebookState} />
      <ambientLight intensity={isDay ? 1.25 : 0.84} color={isDay ? "#eef4fa" : "#b8c7d9"} />
      <hemisphereLight
        args={[isDay ? "#fff8ea" : "#ffdfb8", isDay ? "#6b442a" : "#2e1c11", isDay ? 0.72 : 0.56]}
      />
      <directionalLight
        position={[4.2, 8.5, 6.2]}
        intensity={isDay ? 3.2 : 2.25}
        color={isDay ? "#fff6e6" : "#b8cce2"}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
        shadow-camera-left={-7.5}
        shadow-camera-right={7.5}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={22}
      />
      <pointLight
        position={[3.8, 3.7, 2.5]}
        intensity={isDay ? 11 : 15}
        distance={10.5}
        decay={1.75}
        color="#ffd8a6"
      />
      <pointLight
        position={[-2.4, 3.6, 2.5]}
        intensity={isDay ? 7 : 8.5}
        distance={9.5}
        decay={1.8}
        color="#ffda9e"
      />
      {/* Gentle environmental illumination from the window */}
      <pointLight
        position={[0, 3.5, -1.4]}
        intensity={isDay ? 6.5 : 4.2}
        distance={9.5}
        decay={1.8}
        color={isDay ? "#fff4dc" : "#8fb8de"}
      />
      <Window
        open={props.blindsOpen}
        theme={props.theme}
        qualityTier={qualityTier}
        onToggleWindowView={props.onToggleWindowView}
        onToggleBlinds={props.onToggleBlinds}
        onHoverChange={props.onHoverChange}
      />
      <mesh position={[0, 0.65, 0.9]} receiveShadow>
        <boxGeometry args={[13, 0.46, 5.5]} />
        <meshStandardMaterial
          color={isDay ? "#5a2815" : "#492010"}
          roughness={0.3}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, 0.89, 0.9]} receiveShadow>
        <boxGeometry args={[13, 0.02, 5.5]} />
        <meshStandardMaterial color={isDay ? "#964623" : "#863c1d"} roughness={0.26} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          position={[-5.8 + i * 1.3, DESK_TOP + 0.0015, 0.9]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.018, 5.4]} />
          <meshBasicMaterial
            color="#32160e"
            transparent
            opacity={0.5}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ))}
      <Lamp
        on={props.lampOn}
        onToggleLamp={props.onToggleLamp}
        onHoverChange={props.onHoverChange}
      />
      <Computer
        phase={props.phase}
        crtState={props.crtState}
        phaseDurationMs={props.phaseDurationMs}
        project={project}
        trayRef={trayRef}
        crtPortalRef={props.crtPortalRef}
        onPlay={props.onPlay}
        onToggleVideoPause={props.onToggleVideoPause}
        onToggleScreenZoom={props.onToggleScreenZoom}
        onTogglePower={props.onTogglePower}
        onHoverChange={props.onHoverChange}
      />
      <DVDSystem
        phase={props.phase}
        selected={props.selected}
        phaseDurationMs={props.phaseDurationMs}
        trayRef={trayRef}
        onSelect={props.onSelect}
        onHoverChange={props.onHoverChange}
      />
      <Notebook
        notebookState={props.notebookState}
        activePage={props.notebookPage}
        targetTurnPage={props.targetTurnPage}
        textScale={props.notebookTextScale}
        pageScrollProgress={props.notebookPageScroll}
        onClickNotebook={props.onClickNotebook}
        onScrollNotebook={props.onScrollNotebook}
        onSelectCategoryTab={props.onSelectCategoryTab}
        onHoverChange={props.onHoverChange}
      />
      <StudentID
        inspecting={props.view === "studentId"}
        onClickStudentID={props.onClickStudentID}
        onHoverChange={props.onHoverChange}
      />
      <mesh position={[5, DESK_TOP + 0.012, 2.05]} rotation={[-Math.PI / 2, 0, 0.1]}>
        <planeGeometry args={[2.3, 1.5]} />
        <meshStandardMaterial color="#cbc6b8" roughness={0.9} />
      </mesh>
    </>
  );
}

export default function Scene(props: SceneProps) {
  const qualityTier = props.qualityTier ?? "high";
  const dpr: [number, number] =
    qualityTier === "mobile" ? [1, 1.15] : qualityTier === "balanced" ? [1, 1.25] : [1, 1.5];
  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [0, 4.35, 9.6], fov: 42 }}
      gl={{
        antialias: qualityTier !== "mobile",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.94,
      }}
    >
      <DeskScene {...props} />
    </Canvas>
  );
}
