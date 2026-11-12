import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { projects, type Project } from "./data";
import { DESK_TOP, DRIVE, DVD_PRESENTATION, type DVDState, type HoverInfo } from "./interaction";

export const CASE_WIDTH = 1.12;
export const CASE_DEPTH = 1.46;
export const CASE_THICKNESS = 0.165;
const HINGE_X = -CASE_WIDTH / 2 + 0.015;
const HOLDER_LOCAL = new THREE.Vector3(0, CASE_THICKNESS / 2 + 0.016, 0);

export type CaseDescriptor = {
  id: string;
  index: number;
  project: Project;
  stackPosition: [number, number, number];
  stackRotation: [number, number, number];
  stackScale: [number, number, number];
  presentationPosition: [number, number, number];
  presentationRotation: [number, number, number];
};

export function getDVDDescriptors(): CaseDescriptor[] {
  return projects.map((project, index) => {
    const firstStack = index < 4;
    const slot = firstStack ? 3 - index : 6 - index;
    const x = firstStack ? 3.68 : 5.02;
    const y = DESK_TOP + CASE_THICKNESS / 2 + slot * CASE_THICKNESS;
    const z = 0.32;
    const yaw = (index % 2 === 0 ? 1 : -1) * 0.014;
    return {
      id: project.id,
      index,
      project,
      stackPosition: [x, y, z],
      stackRotation: [0, yaw, 0],
      stackScale: [1, 1, 1],
      presentationPosition: [...DVD_PRESENTATION.position],
      presentationRotation: [...DVD_PRESENTATION.rotation],
    };
  });
}

function createCaseCoverTexture(project: Project): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#161816";
  ctx.fillRect(0, 0, 512, 680);

  ctx.fillStyle = project.color;
  ctx.fillRect(22, 22, 468, 636);

  // Accent band
  ctx.fillStyle = project.accent;
  ctx.fillRect(22, 480, 468, 92);

  // Top metadata
  ctx.fillStyle = "#151512";
  ctx.font = "700 24px 'IBM Plex Mono', monospace";
  ctx.fillText(`MY VIRTUAL DESK // ${project.id}`, 48, 78, 416);

  // Graphic geometric motif
  ctx.strokeStyle = "rgba(20,20,18,0.22)";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 110, 416, 330);
  ctx.beginPath();
  ctx.arc(256, 275, 96, 0, Math.PI * 2);
  ctx.stroke();

  // Prominent CASE title
  ctx.fillStyle = "#121210";
  ctx.font = "700 34px 'Space Mono', monospace";
  ctx.fillText(project.title, 48, 538, 416);

  ctx.fillStyle = "#181815";
  ctx.font = "600 22px 'IBM Plex Mono', monospace";
  ctx.fillText(project.author.toUpperCase(), 48, 618, 416);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createSpineTexture(project: Project): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#191b18";
  ctx.fillRect(0, 0, 512, 96);

  ctx.fillStyle = project.accent;
  ctx.fillRect(0, 0, 92, 96);

  ctx.fillStyle = "#111210";
  ctx.font = "700 38px 'IBM Plex Mono', monospace";
  ctx.fillText(project.short, 20, 62);

  ctx.fillStyle = "#ece7da";
  ctx.font = "700 28px 'Space Mono', monospace";
  ctx.fillText(project.title, 112, 59, 382);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createLeafletTexture(project: Project): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#eae2ce";
  ctx.fillRect(0, 0, 512, 680);

  ctx.strokeStyle = "#2b2923";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 448, 616);

  ctx.fillStyle = project.accent;
  ctx.fillRect(56, 64, 400, 18);

  ctx.fillStyle = "#1c1b18";
  ctx.font = "700 24px 'IBM Plex Mono', monospace";
  ctx.fillText(`ARCHIVE LEAFLET // ${project.id}`, 56, 132);

  ctx.font = "700 32px 'Space Mono', monospace";
  ctx.fillText(project.title, 56, 202, 400);

  ctx.font = "600 20px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#45423a";
  ctx.fillText(`AUTHOR:   ${project.author}`, 56, 272, 400);
  ctx.fillText(`VIDEO ID: ${project.youtubeVideoId}`, 56, 314, 400);
  ctx.fillText(`EMBED:    ${project.embedUrl}`, 56, 356, 400);

  ctx.fillStyle = "#1c1b18";
  ctx.font = "600 20px 'IBM Plex Mono', monospace";
  ctx.fillText("OPTICAL DISC MASTER — MY VIRTUAL DESK", 56, 592, 400);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createDiscTexture(project: Project): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 512, 512);

  // Outer polycarbonate disc body
  const grad = ctx.createRadialGradient(256, 256, 48, 256, 256, 248);
  grad.addColorStop(0, "#d8dad4");
  grad.addColorStop(0.28, project.color);
  grad.addColorStop(0.72, project.accent);
  grad.addColorStop(0.95, "#232625");
  grad.addColorStop(1, "#121414");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 246, 0, Math.PI * 2);
  ctx.fill();

  // Printed label text on disc surface
  ctx.fillStyle = "#111210";
  ctx.font = "700 24px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(project.title, 256, 146, 340);
  ctx.font = "700 22px 'IBM Plex Mono', monospace";
  ctx.fillText(project.id, 256, 386);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function DriveTray({ trayRef }: { trayRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={trayRef} position={[DRIVE.x, DRIVE.y, DRIVE.closedZ]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.18, 0.05, 1.12]} />
        <meshStandardMaterial color="#4e4c45" roughness={0.52} />
      </mesh>
      {/* Recessed circular platter well */}
      <mesh position={[0, 0.028, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.44, 48]} />
        <meshStandardMaterial color="#252624" roughness={0.76} />
      </mesh>
      {/* Center spindle hub */}
      <mesh position={[0, 0.036, 0.06]}>
        <cylinderGeometry args={[0.075, 0.075, 0.024, 24]} />
        <meshStandardMaterial color="#181917" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

type DVDSystemProps = {
  phase: DVDState;
  selected: number | null;
  phaseDurationMs: number;
  trayRef: React.RefObject<THREE.Group | null>;
  onSelect: (index: number) => void;
  onHoverChange: (info: HoverInfo) => void;
};

const HORIZONTAL_DISC_EULER = new THREE.Euler(-Math.PI / 2, 0, 0);
const HORIZONTAL_DISC_QUAT = new THREE.Quaternion().setFromEuler(HORIZONTAL_DISC_EULER);

export default function DVDSystem({
  phase,
  selected,
  phaseDurationMs,
  trayRef,
  onSelect,
  onHoverChange,
}: DVDSystemProps) {
  const descriptors = useMemo(() => getDVDDescriptors(), []);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const textures = useMemo(
    () =>
      descriptors.map((d) => ({
        cover: createCaseCoverTexture(d.project),
        spine: createSpineTexture(d.project),
        leaflet: createLeafletTexture(d.project),
        disc: createDiscTexture(d.project),
      })),
    [descriptors],
  );

  const caseRefs = useRef<Array<THREE.Group | null>>([]);
  const lidRefs = useRef<Array<THREE.Group | null>>([]);
  const discRefs = useRef<Array<THREE.Mesh | null>>([]);
  const hoverOffsetRefs = useRef<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const phaseElapsedRef = useRef(0);

  useEffect(() => {
    phaseElapsedRef.current = 0;
  }, [phase, selected]);

  const tempVecA = useMemo(() => new THREE.Vector3(), []);
  const tempVecB = useMemo(() => new THREE.Vector3(), []);
  const tempVecC = useMemo(() => new THREE.Vector3(), []);
  const holderWorldPos = useMemo(() => new THREE.Vector3(), []);
  const liftedFromCasePos = useMemo(() => new THREE.Vector3(), []);
  const traySpindlePos = useMemo(() => new THREE.Vector3(), []);
  const hoverAboveTrayPos = useMemo(
    () => new THREE.Vector3(DRIVE.x, DRIVE.y + 0.38, DRIVE.openZ + 0.06),
    [],
  );
  const openTraySpindlePos = useMemo(
    () => new THREE.Vector3(DRIVE.x, DRIVE.y + 0.042, DRIVE.openZ + 0.06),
    [],
  );
  const fixedHolderPos = useMemo(() => new THREE.Vector3(), []);
  const fixedLiftPos = useMemo(() => new THREE.Vector3(), []);
  const discPos = useMemo(() => new THREE.Vector3(), []);
  const tempQuatA = useMemo(() => new THREE.Quaternion(), []);
  const holderDiscQuat = useMemo(() => new THREE.Quaternion(), []);
  const discQuat = useMemo(() => new THREE.Quaternion(), []);
  const presQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempEuler = useMemo(() => new THREE.Euler(), []);

  useEffect(() => {
    return () => {
      for (const t of textures) {
        t.cover.dispose();
        t.spine.dispose();
        t.leaflet.dispose();
        t.disc.dispose();
      }
    };
  }, [textures]);

  useFrame((_, delta) => {
    phaseElapsedRef.current += delta * 1000;
    const rawT = phaseDurationMs > 0 ? Math.min(1, phaseElapsedRef.current / phaseDurationMs) : 1;
    const t = THREE.MathUtils.smoothstep(rawT, 0, 1);

    // 1. Update Optical Drive Tray Z position
    if (trayRef.current) {
      let targetTrayZ = DRIVE.closedZ;
      if (phase === "DRIVE_OPENING") {
        targetTrayZ = THREE.MathUtils.lerp(DRIVE.closedZ, DRIVE.openZ, t);
      } else if (phase === "DISC_INSERTING") {
        targetTrayZ = DRIVE.openZ;
      } else if (phase === "DISC_READING") {
        // First 55% of DISC_READING closes the tray into the computer
        const closeT = THREE.MathUtils.smoothstep(Math.min(1, rawT / 0.55), 0, 1);
        targetTrayZ = THREE.MathUtils.lerp(DRIVE.openZ, DRIVE.closedZ, closeT);
      } else if (phase === "DRIVE_EJECTING") {
        targetTrayZ = THREE.MathUtils.lerp(DRIVE.closedZ, DRIVE.openZ, t);
      } else if (phase === "DISC_RETURNING") {
        // Once the disc lifts and travels back (after 45%), retract the tray
        const closeT = THREE.MathUtils.smoothstep(Math.max(0, (rawT - 0.45) / 0.55), 0, 1);
        targetTrayZ = THREE.MathUtils.lerp(DRIVE.openZ, DRIVE.closedZ, closeT);
      }
      trayRef.current.position.z = THREE.MathUtils.damp(
        trayRef.current.position.z,
        targetTrayZ,
        12,
        delta,
      );
    }

    // 2. Update all 7 DVD Cases and their associated Discs
    for (let i = 0; i < descriptors.length; i++) {
      const desc = descriptors[i];
      const caseGroup = caseRefs.current[i];
      const lidGroup = lidRefs.current[i];
      const discMesh = discRefs.current[i];
      if (!caseGroup || !lidGroup || !discMesh) continue;

      const isSelected = selected === i;
      const hoverTarget = phase === "IDLE" && hoveredIndex === i ? 1 : 0;
      hoverOffsetRefs.current[i] = THREE.MathUtils.damp(
        hoverOffsetRefs.current[i] ?? 0,
        hoverTarget,
        8,
        delta,
      );
      const hoverAmt = hoverOffsetRefs.current[i];
      const stackPos = tempVecA.set(
        desc.stackPosition[0],
        desc.stackPosition[1] + hoverAmt * 0.014,
        desc.stackPosition[2] + hoverAmt * 0.09,
      );
      const presPos = tempVecB.set(...desc.presentationPosition);

      let casePos = stackPos;
      let caseRot = desc.stackRotation;
      let lidAngle = 0;

      if (isSelected) {
        switch (phase) {
          case "DVD_SELECTED":
            casePos = tempVecC.copy(stackPos).lerp(presPos, t);
            caseRot = [
              THREE.MathUtils.lerp(desc.stackRotation[0], desc.presentationRotation[0], t),
              THREE.MathUtils.lerp(desc.stackRotation[1], desc.presentationRotation[1], t),
              THREE.MathUtils.lerp(desc.stackRotation[2], desc.presentationRotation[2], t),
            ];
            lidAngle = 0;
            break;
          case "CASE_OPENING":
            casePos = presPos;
            caseRot = desc.presentationRotation;
            lidAngle = THREE.MathUtils.lerp(0, 2.42, t);
            break;
          case "CASE_OPEN":
          case "DISC_REMOVING":
          case "DRIVE_OPENING":
            casePos = presPos;
            caseRot = desc.presentationRotation;
            lidAngle = 2.42;
            break;
          case "DISC_INSERTING": {
            // After disc clears the case, the empty case closes its lid and returns to its stack
            const closeLidT = THREE.MathUtils.smoothstep(
              Math.min(1, Math.max(0, (rawT - 0.15) / 0.35)),
              0,
              1,
            );
            const returnStackT = THREE.MathUtils.smoothstep(
              Math.min(1, Math.max(0, (rawT - 0.45) / 0.55)),
              0,
              1,
            );
            lidAngle = THREE.MathUtils.lerp(2.42, 0, closeLidT);
            casePos = tempVecC.copy(presPos).lerp(stackPos, returnStackT);
            caseRot = [
              THREE.MathUtils.lerp(
                desc.presentationRotation[0],
                desc.stackRotation[0],
                returnStackT,
              ),
              THREE.MathUtils.lerp(
                desc.presentationRotation[1],
                desc.stackRotation[1],
                returnStackT,
              ),
              THREE.MathUtils.lerp(
                desc.presentationRotation[2],
                desc.stackRotation[2],
                returnStackT,
              ),
            ];
            break;
          }
          case "DRIVE_EJECTING":
            // Selected case moves from stack to presentation position and opens lid to receive disc
            casePos = tempVecC.copy(stackPos).lerp(presPos, t);
            caseRot = [
              THREE.MathUtils.lerp(desc.stackRotation[0], desc.presentationRotation[0], t),
              THREE.MathUtils.lerp(desc.stackRotation[1], desc.presentationRotation[1], t),
              THREE.MathUtils.lerp(desc.stackRotation[2], desc.presentationRotation[2], t),
            ];
            lidAngle = THREE.MathUtils.lerp(
              0,
              2.42,
              THREE.MathUtils.smoothstep(Math.max(0, (rawT - 0.35) / 0.65), 0, 1),
            );
            break;
          case "DISC_RETURNING":
            casePos = presPos;
            caseRot = desc.presentationRotation;
            lidAngle = 2.42;
            break;
          case "CASE_CLOSING":
            casePos = presPos;
            caseRot = desc.presentationRotation;
            lidAngle = THREE.MathUtils.lerp(2.42, 0, t);
            break;
          case "RETURNING_TO_STACK":
            casePos = tempVecC.copy(presPos).lerp(stackPos, t);
            caseRot = [
              THREE.MathUtils.lerp(desc.presentationRotation[0], desc.stackRotation[0], t),
              THREE.MathUtils.lerp(desc.presentationRotation[1], desc.stackRotation[1], t),
              THREE.MathUtils.lerp(desc.presentationRotation[2], desc.stackRotation[2], t),
            ];
            lidAngle = 0;
            break;
          default:
            casePos = stackPos;
            caseRot = desc.stackRotation;
            lidAngle = 0;
            break;
        }
      }

      caseGroup.position.copy(casePos);
      caseGroup.rotation.set(caseRot[0], caseRot[1], caseRot[2]);
      caseGroup.scale.set(...desc.stackScale);
      lidGroup.rotation.z = lidAngle;

      // Compute exact world position and orientation of this case's disc holder
      tempEuler.set(caseRot[0], caseRot[1], caseRot[2]);
      tempQuatA.setFromEuler(tempEuler);
      holderWorldPos.copy(HOLDER_LOCAL).applyQuaternion(tempQuatA).add(casePos);
      holderDiscQuat.copy(tempQuatA).multiply(HORIZONTAL_DISC_QUAT);
      liftedFromCasePos.set(0, 0.52, 0.14).applyQuaternion(tempQuatA).add(holderWorldPos);

      const currentTrayZ = trayRef.current ? trayRef.current.position.z : DRIVE.openZ;
      traySpindlePos.set(DRIVE.x, DRIVE.y + 0.042, currentTrayZ + 0.06);

      if (!isSelected) {
        discMesh.visible = false;
        discMesh.position.copy(holderWorldPos);
        discMesh.quaternion.copy(holderDiscQuat);
        continue;
      }

      // Selected Disc trajectory
      let discVisible = true;
      discPos.copy(holderWorldPos);
      discQuat.copy(holderDiscQuat);

      switch (phase) {
        case "DVD_SELECTED":
        case "RETURNING_TO_STACK":
        case "IDLE":
          discPos.copy(holderWorldPos);
          discQuat.copy(holderDiscQuat);
          discVisible = false;
          break;
        case "CASE_OPENING":
        case "CASE_OPEN":
        case "CASE_CLOSING":
          discPos.copy(holderWorldPos);
          discQuat.copy(holderDiscQuat);
          break;
        case "DISC_REMOVING":
          discPos.copy(holderWorldPos).lerp(liftedFromCasePos, t);
          discQuat.copy(holderDiscQuat).slerp(HORIZONTAL_DISC_QUAT, t);
          break;
        case "DRIVE_OPENING":
          discPos.copy(liftedFromCasePos);
          discQuat.copy(HORIZONTAL_DISC_QUAT);
          break;
        case "DISC_INSERTING": {
          // Fixed presentation hover start so case returning underneath doesn't pull the disc back
          tempEuler.set(...desc.presentationRotation);
          presQuat.setFromEuler(tempEuler);
          fixedHolderPos.copy(HOLDER_LOCAL).applyQuaternion(presQuat).add(presPos);
          fixedLiftPos.set(0, 0.52, 0.14).applyQuaternion(presQuat).add(fixedHolderPos);

          if (rawT < 0.62) {
            const moveT = THREE.MathUtils.smoothstep(rawT / 0.62, 0, 1);
            discPos.copy(fixedLiftPos).lerp(hoverAboveTrayPos, moveT);
          } else {
            const dropT = THREE.MathUtils.smoothstep((rawT - 0.62) / 0.38, 0, 1);
            discPos.copy(hoverAboveTrayPos).lerp(traySpindlePos, dropT);
          }
          discQuat.copy(HORIZONTAL_DISC_QUAT);
          break;
        }
        case "DISC_READING":
          discPos.copy(traySpindlePos);
          discQuat.copy(HORIZONTAL_DISC_QUAT);
          discVisible = currentTrayZ > 0.85;
          break;
        case "PROJECT_LOADING":
        case "PROJECT_READY":
        case "PROJECT_PLAYING":
          discPos.copy(traySpindlePos);
          discQuat.copy(HORIZONTAL_DISC_QUAT);
          discVisible = false;
          break;
        case "DRIVE_EJECTING":
          discPos.copy(traySpindlePos);
          discQuat.copy(HORIZONTAL_DISC_QUAT);
          discVisible = currentTrayZ > 0.78;
          break;
        case "DISC_RETURNING": {
          if (rawT < 0.3) {
            const liftT = THREE.MathUtils.smoothstep(rawT / 0.3, 0, 1);
            discPos.copy(openTraySpindlePos).lerp(hoverAboveTrayPos, liftT);
            discQuat.copy(HORIZONTAL_DISC_QUAT);
          } else if (rawT < 0.72) {
            const travelT = THREE.MathUtils.smoothstep((rawT - 0.3) / 0.42, 0, 1);
            discPos.copy(hoverAboveTrayPos).lerp(liftedFromCasePos, travelT);
            discQuat.copy(HORIZONTAL_DISC_QUAT).slerp(holderDiscQuat, travelT);
          } else {
            const seatT = THREE.MathUtils.smoothstep((rawT - 0.72) / 0.28, 0, 1);
            discPos.copy(liftedFromCasePos).lerp(holderWorldPos, seatT);
            discQuat.copy(holderDiscQuat);
          }
          break;
        }
        default:
          discPos.copy(holderWorldPos);
          discQuat.copy(holderDiscQuat);
          break;
      }

      discMesh.visible = discVisible;
      discMesh.position.copy(discPos);
      discMesh.quaternion.copy(discQuat);
    }
  });

  const canSelect = phase === "IDLE";

  return (
    <>
      {/* Contact shadows under the two DVD stacks */}
      <mesh position={[3.68, DESK_TOP + 0.003, 0.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CASE_WIDTH + 0.24, CASE_DEPTH + 0.24]} />
        <meshBasicMaterial
          color="#120804"
          transparent
          opacity={0.38}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh position={[5.02, DESK_TOP + 0.003, 0.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CASE_WIDTH + 0.24, CASE_DEPTH + 0.24]} />
        <meshBasicMaterial
          color="#120804"
          transparent
          opacity={0.38}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {descriptors.map((desc, i) => {
        const tex = textures[i];
        return (
          <group key={desc.id}>
            {/* DVD Case Hierarchy */}
            <group
              ref={(el) => {
                caseRefs.current[i] = el;
              }}
              position={desc.stackPosition}
              rotation={desc.stackRotation}
              scale={desc.stackScale}
              onClick={(event) => {
                event.stopPropagation();
                if (canSelect) onSelect(i);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHoveredIndex(i);
                onHoverChange({
                  id: "dvd",
                  label: `LOAD ${desc.id} — ${desc.project.title.toUpperCase()}`,
                });
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                setHoveredIndex((prev) => (prev === i ? null : prev));
                onHoverChange(null);
              }}
            >
              {/* Outer Case Base */}
              <RoundedBox
                args={[CASE_WIDTH, CASE_THICKNESS, CASE_DEPTH]}
                radius={0.03}
                smoothness={2}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color="#181a18" roughness={0.5} />
              </RoundedBox>

              {/* Front Spine Label (facing camera +Z) */}
              <mesh position={[0, 0, CASE_DEPTH / 2 + 0.002]}>
                <planeGeometry args={[CASE_WIDTH - 0.06, CASE_THICKNESS - 0.02]} />
                <meshStandardMaterial map={tex.spine} roughness={0.6} />
              </mesh>

              {/* Left Spine Label (facing computer -X) */}
              <mesh position={[-CASE_WIDTH / 2 - 0.002, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[CASE_DEPTH - 0.06, CASE_THICKNESS - 0.02]} />
                <meshStandardMaterial map={tex.spine} roughness={0.6} />
              </mesh>

              {/* Interior Tray Well & Disc Holder Spindle */}
              <mesh position={[0, CASE_THICKNESS / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[CASE_WIDTH - 0.08, CASE_DEPTH - 0.08]} />
                <meshStandardMaterial color="#202220" roughness={0.75} />
              </mesh>
              <mesh position={HOLDER_LOCAL} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.09, 0.44, 48]} />
                <meshStandardMaterial color="#2b2d2a" roughness={0.58} />
              </mesh>
              <mesh position={[0, CASE_THICKNESS / 2 + 0.02, 0]}>
                <cylinderGeometry args={[0.075, 0.075, 0.02, 20]} />
                <meshStandardMaterial color="#121312" roughness={0.4} />
              </mesh>

              {/* Physical Hinge Cylinder along Left Edge */}
              <mesh
                position={[HINGE_X, CASE_THICKNESS / 2 + 0.015, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.024, 0.024, CASE_DEPTH - 0.04, 12]} />
                <meshStandardMaterial color="#141615" roughness={0.5} />
              </mesh>

              {/* Outer Case Lid (Pivoted at Left Hinge Edge HINGE_X) */}
              <group
                ref={(el) => {
                  lidRefs.current[i] = el;
                }}
                position={[HINGE_X, CASE_THICKNESS / 2 + 0.02, 0]}
              >
                <group position={[CASE_WIDTH / 2 - 0.015, 0, 0]}>
                  <RoundedBox
                    args={[CASE_WIDTH, 0.04, CASE_DEPTH]}
                    radius={0.024}
                    smoothness={2}
                    castShadow
                    receiveShadow
                  >
                    <meshStandardMaterial color="#222422" roughness={0.48} />
                  </RoundedBox>
                  {/* Printed Outer Cover Artwork */}
                  <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[CASE_WIDTH - 0.05, CASE_DEPTH - 0.05]} />
                    <meshStandardMaterial map={tex.cover} roughness={0.62} />
                  </mesh>
                  {/* Inner Leaflet Artwork (visible when lid opens) */}
                  <mesh position={[0, -0.022, 0]} rotation={[Math.PI / 2, Math.PI, 0]}>
                    <planeGeometry args={[CASE_WIDTH - 0.08, CASE_DEPTH - 0.08]} />
                    <meshStandardMaterial map={tex.leaflet} roughness={0.78} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* Printed Optical Disc belonging to this DVD Case */}
            <mesh
              ref={(el) => {
                discRefs.current[i] = el;
              }}
              castShadow
            >
              <ringGeometry args={[0.085, 0.42, 64]} />
              <meshPhysicalMaterial
                map={tex.disc}
                metalness={0.55}
                roughness={0.2}
                iridescence={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
