import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { studentIdentity } from "./data";
import { DESK_TOP, type HoverInfo } from "./interaction";

const ID_DESK_POS = new THREE.Vector3(-2.72, DESK_TOP + 0.015, 1.04);
const ID_INSPECT_POS = new THREE.Vector3(-2.72, DESK_TOP + 0.38, 1.38);

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStudentIDCard(
  ctx: CanvasRenderingContext2D,
  photoImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
) {
  const w = 720;
  const h = 1080;

  // Card base
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f5f4f0");
  bg.addColorStop(0.55, "#eceae4");
  bg.addColorStop(1, "#e2dfd8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal geometric security lines in background
  ctx.strokeStyle = "rgba(180, 44, 52, 0.06)";
  ctx.lineWidth = 3;
  for (let i = -h; i < w + h; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h * 0.45, h);
    ctx.stroke();
  }

  // Left red vertical banner ("NON SCHOLAE SED VITAE")
  ctx.fillStyle = "#b82d36";
  ctx.fillRect(0, 0, 86, h);

  // Top diagonal crimson header block
  ctx.fillStyle = "#b82d36";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, 108);
  ctx.lineTo(290, 128);
  ctx.lineTo(86, 212);
  ctx.lineTo(0, 212);
  ctx.closePath();
  ctx.fill();

  // Right vertical accent border ("NOT OF SCHOOL BUT OF LIFE")
  ctx.fillStyle = "rgba(184, 45, 54, 0.14)";
  ctx.fillRect(w - 64, 108, 64, h - 108);
  ctx.fillStyle = "#b82d36";
  ctx.fillRect(w - 64, h - 290, 64, 290);

  // Left vertical motto text (bottom to top)
  ctx.save();
  ctx.translate(58, h - 68);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(248, 238, 238, 0.85)";
  ctx.font = "700 44px 'Space Mono', monospace";
  ctx.fillText(studentIdentity.latinMotto, 0, 0);
  ctx.restore();

  // Right vertical motto text (top to bottom)
  ctx.save();
  ctx.translate(w - 44, 470);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "rgba(184, 45, 54, 0.55)";
  ctx.font = "700 32px 'Space Mono', monospace";
  ctx.fillText("NOT OF SCHOOL", 0, 0);
  ctx.fillStyle = "rgba(250, 240, 240, 0.9)";
  ctx.fillText("BUT OF LIFE", 310, 0);
  ctx.restore();

  // Top-left University Seal (Round UNC Logo)
  const sealX = 96;
  const sealY = 98;
  const sealRadius = 54;

  ctx.save();
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const drawRadius = sealRadius + 2;
    ctx.drawImage(logoImg, sealX - drawRadius, sealY - drawRadius, drawRadius * 2, drawRadius * 2);
  } else {
    ctx.fillStyle = "#f7f5f0";
    ctx.fillRect(sealX - sealRadius, sealY - sealRadius, sealRadius * 2, sealRadius * 2);
    ctx.strokeStyle = "#b82d36";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#2b6e46";
    ctx.font = "700 18px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("UNC", sealX, sealY + 6);
    ctx.font = "700 11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#b82d36";
    ctx.fillText("1948", sealX, sealY + 24);
  }
  ctx.restore();

  // Crisp round border ring around the UNC seal
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius - 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(184, 45, 54, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top University Header Text
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 25px 'Space Mono', monospace";
  ctx.fillText(studentIdentity.university, 418, 52);

  ctx.fillStyle = "#f8d7d9";
  ctx.font = "700 15px 'IBM Plex Mono', monospace";
  ctx.fillText(studentIdentity.tagline, 418, 82);

  ctx.fillStyle = "#484442";
  ctx.font = "600 13px 'IBM Plex Mono', monospace";
  ctx.fillText(studentIdentity.address, 430, 118);

  // Student ID Number above photo (right-aligned)
  ctx.textAlign = "right";
  ctx.fillStyle = "#b82d36";
  ctx.font = "700 34px 'Space Mono', monospace";
  ctx.fillText("23-***6", 596, 198);

  // Portrait Photo Frame
  const px = 148;
  const py = 222;
  const pw = 452;
  const ph = 452;

  ctx.save();
  drawRoundedRectPath(ctx, px, py, pw, ph, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();

  if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
    const imgRatio = photoImg.naturalWidth / photoImg.naturalHeight;
    const boxRatio = pw / ph;
    let sx = 0;
    let sy = 0;
    let sw = photoImg.naturalWidth;
    let sh = photoImg.naturalHeight;
    if (imgRatio > boxRatio) {
      sw = photoImg.naturalHeight * boxRatio;
      sx = (photoImg.naturalWidth - sw) / 2;
    } else {
      sh = photoImg.naturalWidth / boxRatio;
      sy = (photoImg.naturalHeight - sh) * 0.2;
    }
    ctx.drawImage(photoImg, sx, sy, sw, sh, px, py, pw, ph);
  } else {
    // Clean portrait silhouette fallback while image loads
    ctx.fillStyle = "#eceef2";
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = "#2b3038";
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + 185, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + 430, 165, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();

  // Red border around portrait photo
  drawRoundedRectPath(ctx, px, py, pw, ph, 26);
  ctx.strokeStyle = "#b82d36";
  ctx.lineWidth = 7;
  ctx.stroke();

  // Student Name
  ctx.textAlign = "center";
  const centerCol = 374;
  ctx.fillStyle = "#1d1d1b";
  ctx.font = "700 54px 'Space Mono', monospace";
  ctx.fillText(studentIdentity.lastName, centerCol, 742);

  ctx.font = "700 31px 'IBM Plex Mono', monospace";
  ctx.fillText(studentIdentity.firstName, centerCol, 788);

  // Department
  ctx.fillStyle = "#b82d36";
  ctx.font = "700 22px 'IBM Plex Mono', monospace";
  ctx.fillText(studentIdentity.departmentLine1, centerCol, 858);
  ctx.fillText(studentIdentity.departmentLine2, centerCol, 890);

  // Blurred-out Registrar Signature & Name at bottom (privacy-redacted)
  ctx.save();
  const blurBoxX = centerCol - 138;
  const blurBoxY = 952;
  const blurBoxW = 276;
  const blurBoxH = 56;
  drawRoundedRectPath(ctx, blurBoxX, blurBoxY, blurBoxW, blurBoxH, 10);
  ctx.clip();

  try {
    ctx.filter = "blur(7px)";
  } catch {
    // Fallback handled by multi-offset Gaussian pass below
  }

  // Multi-offset Gaussian blur pass so the name is completely blurred in all browsers
  const blurOffsets = [
    [-7, -2],
    [-4, 2],
    [-2, -3],
    [0, 0],
    [2, 3],
    [5, -2],
    [7, 1],
  ];
  ctx.font = "700 22px 'IBM Plex Mono', monospace";
  for (const [ox, oy] of blurOffsets) {
    ctx.fillStyle = "rgba(30, 30, 28, 0.22)";
    ctx.fillText("████████ ████ ████████", centerCol + ox, 998 + oy);
  }

  ctx.strokeStyle = "rgba(25, 25, 25, 0.28)";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(318, 990);
  ctx.bezierCurveTo(334, 946, 368, 950, 356, 994);
  ctx.bezierCurveTo(348, 964, 392, 954, 412, 984);
  ctx.stroke();

  // Soft frosted privacy blur glaze over the name bar
  const blurGrad = ctx.createLinearGradient(blurBoxX, blurBoxY, blurBoxX + blurBoxW, blurBoxY);
  blurGrad.addColorStop(0, "rgba(230, 232, 235, 0.15)");
  blurGrad.addColorStop(0.2, "rgba(214, 217, 222, 0.52)");
  blurGrad.addColorStop(0.8, "rgba(214, 217, 222, 0.52)");
  blurGrad.addColorStop(1, "rgba(230, 232, 235, 0.15)");
  ctx.fillStyle = blurGrad;
  ctx.fillRect(blurBoxX, 974, blurBoxW, 32);
  ctx.restore();

  ctx.font = "600 17px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#3c3b38";
  ctx.fillText(studentIdentity.registrarTitle, centerCol, 1028);
  ctx.textAlign = "left";
}

function createLanyardStrapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  // Deep navy & black UNC SCIS cyber lanyard gradient
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, "#0b1536");
  grad.addColorStop(0.35, "#111e52");
  grad.addColorStop(0.68, "#0f1218");
  grad.addColorStop(1, "#0b1536");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 160);

  // Binary cyber pattern in background
  ctx.fillStyle = "rgba(245, 166, 35, 0.14)";
  ctx.font = "700 22px 'IBM Plex Mono', monospace";
  ctx.fillText("0101 1100 0110 1010 0101 1101 0101 1001 0101", 24, 34);
  ctx.fillText("1010 0101 1001 0110 1010 0101 0110 1100 1010", 24, 144);

  // Gold checkered cyber blocks
  ctx.fillStyle = "#f29d26";
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(40 + col * 24, 44 + row * 24, 20, 20);
      }
    }
  }

  // Bold gold UNC text
  ctx.fillStyle = "#f5a623";
  ctx.font = "700 78px 'Space Mono', monospace";
  ctx.fillText("UNC", 190, 108);

  // White University & SCIS text
  ctx.fillStyle = "#f4f6fa";
  ctx.font = "700 22px 'IBM Plex Mono', monospace";
  ctx.fillText("UNIVERSITY OF NUEVA CACERES", 390, 68);
  ctx.fillStyle = "#f5a623";
  ctx.fillText("SCHOOL OF COMPUTER AND INFORMATION SCIENCES >>", 390, 104);

  // Gold SCIS emblem block
  ctx.fillStyle = "#f5a623";
  ctx.font = "700 58px 'Space Mono', monospace";
  ctx.fillText("SCIS", 846, 104);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds a continuous, smoothly curved 3D fabric lanyard ribbon loop that starts at the
 * top clasp collar (0, 0.009, -0.47), drapes naturally to the left and right on the desk,
 * curves smoothly around the top at z = -0.98, and returns seamlessly to the clasp collar.
 */
function createContinuousLanyardGeometry(): THREE.BufferGeometry {
  const controlPoints = [
    new THREE.Vector3(0.0, 0.009, -0.47),
    new THREE.Vector3(-0.045, 0.008, -0.54),
    new THREE.Vector3(-0.14, 0.006, -0.68),
    new THREE.Vector3(-0.19, 0.005, -0.84),
    new THREE.Vector3(-0.12, 0.005, -0.97),
    new THREE.Vector3(0.0, 0.005, -1.01),
    new THREE.Vector3(0.12, 0.005, -0.97),
    new THREE.Vector3(0.19, 0.005, -0.84),
    new THREE.Vector3(0.14, 0.006, -0.68),
    new THREE.Vector3(0.045, 0.008, -0.54),
    new THREE.Vector3(0.0, 0.009, -0.47),
  ];

  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", 0.5);
  const segments = 96;
  const halfWidth = 0.044; // 0.088 total strap width
  const halfThick = 0.003;

  const pts = curve.getSpacedPoints(segments);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();

  // Generate top and bottom ribbon faces with continuous UVs along the loop
  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    curve.getTangent(i / segments, tangent);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, -1);
    tangent.normalize();
    side.crossVectors(up, tangent).normalize();

    // Twist slightly near the clasp pinch (first & last 12% of curve) so the two ends meet neatly
    const pinch = Math.sin(Math.min(1, Math.min(i / 12, (segments - i) / 12)) * (Math.PI / 2));
    const w = halfWidth * (0.52 + 0.48 * pinch);

    const leftX = p.x - side.x * w;
    const leftZ = p.z - side.z * w;
    const rightX = p.x + side.x * w;
    const rightZ = p.z + side.z * w;
    const u = (i / segments) * 2.2;

    // 0: Top-left, 1: Top-right, 2: Bottom-left, 3: Bottom-right
    positions.push(leftX, p.y + halfThick, leftZ);
    normals.push(0, 1, 0);
    uvs.push(u, 0);

    positions.push(rightX, p.y + halfThick, rightZ);
    normals.push(0, 1, 0);
    uvs.push(u, 1);

    positions.push(leftX, p.y - halfThick, leftZ);
    normals.push(0, -1, 0);
    uvs.push(u, 0);

    positions.push(rightX, p.y - halfThick, rightZ);
    normals.push(0, -1, 0);
    uvs.push(u, 1);
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 4;
    const next = (i + 1) * 4;
    // Top face
    indices.push(base, base + 1, next + 1);
    indices.push(base, next + 1, next);
    // Bottom face
    indices.push(base + 2, next + 3, base + 3);
    indices.push(base + 2, next + 2, next + 3);
    // Left edge
    indices.push(base, next, next + 2);
    indices.push(base, next + 2, base + 2);
    // Right edge
    indices.push(base + 1, base + 3, next + 3);
    indices.push(base + 1, next + 3, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

type StudentIDProps = {
  inspecting: boolean;
  maskStudentNumber?: boolean;
  onClickStudentID: () => void;
  onHoverChange: (info: HoverInfo) => void;
};

export default function StudentID({ inspecting, onClickStudentID, onHoverChange }: StudentIDProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  const { idCtx, idTexture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 1080;
    const context = c.getContext("2d")!;
    drawStudentIDCard(context, null, null);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return { idCtx: context, idTexture: tex };
  }, []);

  const lanyardTexture = useMemo(() => createLanyardStrapTexture(), []);
  const lanyardLoopGeo = useMemo(() => createContinuousLanyardGeometry(), []);

  useEffect(() => {
    return () => {
      idTexture.dispose();
      lanyardTexture.dispose();
      lanyardLoopGeo.dispose();
    };
  }, [idTexture, lanyardTexture, lanyardLoopGeo]);

  // Load actual student portrait image and UNC seal logo image
  useEffect(() => {
    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    photoImg.onload = () => {
      photoRef.current = photoImg;
      drawStudentIDCard(idCtx, photoRef.current, logoRef.current);
      idTexture.needsUpdate = true;
    };
    photoImg.src = studentIdentity.photoUrl;

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
      logoRef.current = logoImg;
      drawStudentIDCard(idCtx, photoRef.current, logoRef.current);
      idTexture.needsUpdate = true;
    };
    logoImg.src = studentIdentity.logoUrl;
  }, [idCtx, idTexture]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = inspecting ? ID_INSPECT_POS.y : hovered ? ID_DESK_POS.y + 0.018 : ID_DESK_POS.y;
    const targetZ = inspecting ? ID_INSPECT_POS.z : ID_DESK_POS.z;
    const targetYaw = inspecting ? 0 : hovered ? -0.08 : -0.14;
    const targetPitch = inspecting ? 0.32 : 0;

    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      6,
      delta,
    );
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      targetZ,
      6,
      delta,
    );
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetYaw,
      6,
      delta,
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetPitch,
      6,
      delta,
    );
  });

  return (
    <group
      ref={groupRef}
      position={[ID_DESK_POS.x, ID_DESK_POS.y, ID_DESK_POS.z]}
      rotation={[0, -0.14, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onClickStudentID();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        onHoverChange({ id: "studentId", label: "VIEW STUDENT ID" });
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        onHoverChange(null);
      }}
    >
      {/* Soft ground contact shadow directly on the wooden desk */}
      <mesh position={[0, -0.011, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.88]} />
        <meshBasicMaterial
          color="#120804"
          transparent
          opacity={inspecting ? 0.08 : 0.26}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* Rigid Rounded Plastic ID Holder Base (#9e9c94 warm gray from reference) */}
      <RoundedBox args={[0.58, 0.022, 0.86]} radius={0.009} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color={hovered ? "#b2b0a8" : "#9e9c94"}
          roughness={0.62}
          metalness={0.04}
        />
      </RoundedBox>

      {/* Top slot hole in the plastic holder */}
      <mesh position={[0, 0.013, -0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, 0.032]} />
        <meshBasicMaterial color="#1c1612" />
      </mesh>

      {/* Actual University of Nueva Caceres Student ID Card inside the holder (matte finish for readability) */}
      <mesh position={[0, 0.0135, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.48, 0.72]} />
        <meshStandardMaterial map={idTexture} color="#ffffff" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Subtle Anti-Glare Protective Plastic Sleeve Window over the ID card */}
      <mesh position={[0, 0.016, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.49, 0.73]} />
        <meshStandardMaterial
          color="#f7f5f0"
          transparent
          opacity={inspecting ? 0.025 : 0.055}
          roughness={0.78}
          metalness={0.0}
          depthWrite={false}
        />
      </mesh>

      {/* Connected Metal Badge Clip & Fabric Collar Hooked Cleanly into the Top Slot */}
      <group position={[0, 0.013, -0.39]}>
        {/* Flat metal clip loop passing through the slot hole */}
        <RoundedBox args={[0.046, 0.012, 0.052]} radius={0.004} smoothness={2} castShadow>
          <meshStandardMaterial color="#d4d8de" metalness={0.82} roughness={0.26} />
        </RoundedBox>
        {/* Flat horizontal metal D-ring lying flush with the card */}
        <mesh position={[0, 0.001, -0.036]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.026, 0.005, 10, 24]} />
          <meshStandardMaterial color="#cfd3d8" metalness={0.85} roughness={0.24} />
        </mesh>
        {/* Stitched Navy Fabric Lanyard Collar with Silver Rivet & Gold SCIS Emblem */}
        <RoundedBox
          position={[0, 0.0, -0.082]}
          args={[0.092, 0.014, 0.095]}
          radius={0.005}
          smoothness={2}
          castShadow
        >
          <meshStandardMaterial color="#0e1944" roughness={0.78} />
        </RoundedBox>
        {/* Silver metal rivet */}
        <mesh position={[0, 0.008, -0.058]}>
          <cylinderGeometry args={[0.011, 0.011, 0.004, 16]} />
          <meshStandardMaterial color="#d6d9de" metalness={0.85} roughness={0.24} />
        </mesh>
        {/* Circular Gold SCIS Emblem on collar */}
        <mesh position={[0, 0.008, -0.094]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.022, 20]} />
          <meshStandardMaterial color="#e09a2b" metalness={0.45} roughness={0.4} />
        </mesh>
      </group>

      {/* Continuous 3D Draped UNC SCIS Lanyard Ribbon Loop */}
      <mesh geometry={lanyardLoopGeo} castShadow receiveShadow>
        <meshStandardMaterial map={lanyardTexture} roughness={0.78} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
