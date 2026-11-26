import * as THREE from 'three';

export interface ProceduralTexturePack {
  deckAlbedo: THREE.CanvasTexture;
  deckRoughness: THREE.CanvasTexture;
  deckBump: THREE.CanvasTexture;
  deckNormal: THREE.CanvasTexture;
  rustMetalAlbedo: THREE.CanvasTexture;
  rustMetalRoughness: THREE.CanvasTexture;
  rustNormal: THREE.CanvasTexture;
  armorNormal: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  hazardAlbedo: THREE.CanvasTexture;
  containerBump: THREE.CanvasTexture;
  shadowDisc: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Converts a greyscale height-field canvas into a tangent-space RGB normal map canvas.
 * Ensures crisp specular bevels and micro-scratches on PBR & MeshPhysicalMaterial surfaces.
 */
function heightCanvasToNormalCanvas(
  heightCanvas: HTMLCanvasElement,
  strength: number,
): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const [outCanvas, outCtx] = makeCanvas(w);
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3x3 Sobel filter for smooth continuous normals
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export function createProceduralTexturePack(maxAniso: number): ProceduralTexturePack {
  // 1. Weathered steel / wet concrete dock floor (albedo + roughness + bump + normal)
  const [deckC, deckCtx] = makeCanvas(512);
  deckCtx.fillStyle = '#202630';
  deckCtx.fillRect(0, 0, 512, 512);

  deckCtx.strokeStyle = 'rgba(10, 13, 18, 0.78)';
  deckCtx.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) {
    deckCtx.beginPath();
    deckCtx.moveTo(i, 0);
    deckCtx.lineTo(i, 512);
    deckCtx.stroke();
    deckCtx.beginPath();
    deckCtx.moveTo(0, i);
    deckCtx.lineTo(512, i);
    deckCtx.stroke();
  }
  deckCtx.fillStyle = 'rgba(212, 164, 72, 0.14)';
  deckCtx.fillRect(0, 250, 512, 10);
  deckCtx.fillRect(250, 0, 10, 512);
  deckCtx.fillStyle = 'rgba(195, 210, 230, 0.14)';
  for (let x = 8; x < 512; x += 64) {
    for (let y = 8; y < 512; y += 64) {
      deckCtx.fillRect(x, y, 2, 2);
      deckCtx.fillRect(x + 48, y + 48, 2, 2);
    }
  }

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 22;
    const roll = Math.random();
    if (roll < 0.32) {
      deckCtx.fillStyle = 'rgba(118, 62, 30, 0.14)';
    } else if (roll < 0.54) {
      deckCtx.fillStyle = 'rgba(32, 72, 58, 0.16)';
    } else if (roll < 0.78) {
      deckCtx.fillStyle = 'rgba(10, 14, 20, 0.22)';
    } else {
      deckCtx.fillStyle = 'rgba(130, 145, 165, 0.08)';
    }
    deckCtx.beginPath();
    deckCtx.arc(x, y, r, 0, Math.PI * 2);
    deckCtx.fill();
  }

  deckCtx.strokeStyle = 'rgba(7, 9, 13, 0.65)';
  deckCtx.lineWidth = 1.4;
  for (let c = 0; c < 14; c++) {
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    deckCtx.beginPath();
    deckCtx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 44;
      cy += (Math.random() - 0.5) * 44;
      deckCtx.lineTo(cx, cy);
    }
    deckCtx.stroke();
  }

  const [roughC, roughCtx] = makeCanvas(512);
  roughCtx.fillStyle = '#bdbdbd';
  roughCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 95; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 14 + Math.random() * 38;
    const grad = roughCtx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(35, 35, 35, 0.85)');
    grad.addColorStop(1, 'rgba(185, 185, 185, 0)');
    roughCtx.fillStyle = grad;
    roughCtx.beginPath();
    roughCtx.arc(x, y, r, 0, Math.PI * 2);
    roughCtx.fill();
  }

  const [bumpC, bumpCtx] = makeCanvas(512);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 512, 512);
  bumpCtx.strokeStyle = '#303030';
  bumpCtx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 64) {
    bumpCtx.strokeRect(i, 0, 64, 512);
    bumpCtx.strokeRect(0, i, 512, 64);
  }
  bumpCtx.fillStyle = '#d4d4d4';
  for (let x = 8; x < 512; x += 64) {
    for (let y = 8; y < 512; y += 64) {
      bumpCtx.fillRect(x, y, 3, 3);
      bumpCtx.fillRect(x + 48, y, 3, 3);
      bumpCtx.fillRect(x, y + 48, 3, 3);
      bumpCtx.fillRect(x + 48, y + 48, 3, 3);
    }
  }
  const deckNormalC = heightCanvasToNormalCanvas(bumpC, 1.45);

  // 2. Rusted Ship Hull Metal (Polina L., containers & cranes)
  const [rustC, rustCtx] = makeCanvas(256);
  rustCtx.fillStyle = '#4f5a66';
  rustCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    rustCtx.fillStyle = Math.random() < 0.65 ? 'rgba(128, 61, 28, 0.28)' : 'rgba(180, 96, 44, 0.16)';
    rustCtx.fillRect(x, y, 4 + Math.random() * 18, 8 + Math.random() * 28);
  }
  rustCtx.strokeStyle = 'rgba(20, 24, 30, 0.6)';
  rustCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) {
    rustCtx.beginPath();
    rustCtx.moveTo(0, y);
    rustCtx.lineTo(256, y);
    rustCtx.stroke();
  }

  const [rustRoughC, rustRoughCtx] = makeCanvas(256);
  rustRoughCtx.fillStyle = '#757575';
  rustRoughCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    rustRoughCtx.fillStyle = Math.random() < 0.5 ? '#d8d8d8' : '#4a4a4a';
    rustRoughCtx.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 20, 6 + Math.random() * 20);
  }

  const [rustHeightC, rustHeightCtx] = makeCanvas(256);
  rustHeightCtx.fillStyle = '#808080';
  rustHeightCtx.fillRect(0, 0, 256, 256);
  rustHeightCtx.strokeStyle = '#363636';
  rustHeightCtx.lineWidth = 3;
  for (let y = 0; y < 256; y += 64) {
    rustHeightCtx.beginPath();
    rustHeightCtx.moveTo(0, y);
    rustHeightCtx.lineTo(256, y);
    rustHeightCtx.stroke();
  }
  for (let x = 0; x < 256; x += 128) {
    rustHeightCtx.beginPath();
    rustHeightCtx.moveTo(x, 0);
    rustHeightCtx.lineTo(x, 256);
    rustHeightCtx.stroke();
  }
  for (let i = 0; i < 200; i++) {
    rustHeightCtx.fillStyle = Math.random() < 0.5 ? '#969696' : '#656565';
    rustHeightCtx.fillRect(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 3 + Math.random() * 10);
  }
  const rustNormalC = heightCanvasToNormalCanvas(rustHeightC, 1.35);

  // 3. Exosuit Armor Normal + Micro-Scratch Roughness Maps (512x512)
  const [armorHeightC, armorHeightCtx] = makeCanvas(512);
  const [armorRoughC, armorRoughCtx] = makeCanvas(512);

  // Base brushed-titanium neutral height & semi-matte painted armor roughness
  armorHeightCtx.fillStyle = '#828282';
  armorHeightCtx.fillRect(0, 0, 512, 512);
  armorRoughCtx.fillStyle = '#686868';
  armorRoughCtx.fillRect(0, 0, 512, 512);

  // Fine directional brushed-metal streaks
  for (let i = 0; i < 650; i++) {
    const y = Math.random() * 512;
    const x = Math.random() * 512;
    const len = 14 + Math.random() * 56;
    const bright = Math.random() < 0.5;
    armorHeightCtx.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    armorHeightCtx.fillRect(x, y, len, 1);
    armorRoughCtx.fillStyle = bright ? 'rgba(60,60,60,0.22)' : 'rgba(130,130,130,0.18)';
    armorRoughCtx.fillRect(x, y, len, 1);
  }

  // Armor panel seams + recessed beveled grooves (matte grime inside seams)
  armorHeightCtx.strokeStyle = '#2c2c2c';
  armorHeightCtx.lineWidth = 4;
  armorRoughCtx.strokeStyle = '#d0d0d0';
  armorRoughCtx.lineWidth = 4;
  for (let p = 64; p < 512; p += 128) {
    armorHeightCtx.strokeRect(p - 64, 0, 128, 512);
    armorHeightCtx.strokeRect(0, p - 64, 512, 128);
    armorRoughCtx.strokeRect(p - 64, 0, 128, 512);
    armorRoughCtx.strokeRect(0, p - 64, 512, 128);
  }

  // Hexagonal rivet heads along plate corners
  for (let x = 14; x < 512; x += 128) {
    for (let y = 14; y < 512; y += 128) {
      for (const [ox, oy] of [[0, 0], [100, 0], [0, 100], [100, 100]]) {
        armorHeightCtx.fillStyle = '#e0e0e0';
        armorHeightCtx.beginPath();
        armorHeightCtx.arc(x + ox, y + oy, 3.2, 0, Math.PI * 2);
        armorHeightCtx.fill();

        armorRoughCtx.fillStyle = '#3c3c3c';
        armorRoughCtx.beginPath();
        armorRoughCtx.arc(x + ox, y + oy, 3.2, 0, Math.PI * 2);
        armorRoughCtx.fill();
      }
    }
  }

  // Diagonal battle micro-scratches: incised height grooves + shiny exposed bare metal (#262626)
  for (let s = 0; s < 170; s++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 512;
    const ang = (Math.random() - 0.5) * 1.4 - 0.35;
    const len = 10 + Math.random() * 34;
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;

    armorHeightCtx.strokeStyle = 'rgba(28, 28, 28, 0.72)';
    armorHeightCtx.lineWidth = 0.8 + Math.random() * 1.1;
    armorHeightCtx.beginPath();
    armorHeightCtx.moveTo(sx, sy);
    armorHeightCtx.lineTo(ex, ey);
    armorHeightCtx.stroke();

    armorRoughCtx.strokeStyle = 'rgba(38, 38, 38, 0.9)';
    armorRoughCtx.lineWidth = 1.1 + Math.random() * 1.2;
    armorRoughCtx.beginPath();
    armorRoughCtx.moveTo(sx, sy);
    armorRoughCtx.lineTo(ex, ey);
    armorRoughCtx.stroke();
  }
  const armorNormalC = heightCanvasToNormalCanvas(armorHeightC, 1.8);

  // 4. Hazard-striped Crane Beam
  const [hazC, hazCtx] = makeCanvas(256);
  hazCtx.fillStyle = '#d49a2a';
  hazCtx.fillRect(0, 0, 256, 256);
  hazCtx.fillStyle = '#181c22';
  for (let x = -256; x < 512; x += 48) {
    hazCtx.beginPath();
    hazCtx.moveTo(x, 0);
    hazCtx.lineTo(x + 24, 0);
    hazCtx.lineTo(x - 104, 256);
    hazCtx.lineTo(x - 128, 256);
    hazCtx.closePath();
    hazCtx.fill();
  }
  for (let i = 0; i < 120; i++) {
    hazCtx.fillStyle = 'rgba(95, 52, 24, 0.25)';
    hazCtx.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 3 + Math.random() * 8);
  }

  // 5. Corrugated Container Bump
  const [contC, contCtx] = makeCanvas(128);
  contCtx.fillStyle = '#808080';
  contCtx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    contCtx.fillStyle = '#cfcfcf';
    contCtx.fillRect(x, 0, 7, 128);
    contCtx.fillStyle = '#404040';
    contCtx.fillRect(x + 8, 0, 7, 128);
  }

  // 6. Contact Shadow Radial Disc
  const [shC, shCtx] = makeCanvas(128);
  const shGrad = shCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  shGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.28)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const shadowDisc = new THREE.CanvasTexture(shC);
  shadowDisc.colorSpace = THREE.SRGBColorSpace;

  const deckAlbedo = finalizeTexture(deckC, true, 12, 12, maxAniso);
  const deckRoughness = finalizeTexture(roughC, false, 12, 12, maxAniso);
  const deckBump = finalizeTexture(bumpC, false, 12, 12, maxAniso);
  const deckNormal = finalizeTexture(deckNormalC, false, 12, 12, maxAniso);
  const rustMetalAlbedo = finalizeTexture(rustC, true, 3, 2, maxAniso);
  const rustMetalRoughness = finalizeTexture(rustRoughC, false, 3, 2, maxAniso);
  const rustNormal = finalizeTexture(rustNormalC, false, 3, 2, maxAniso);
  const armorNormal = finalizeTexture(armorNormalC, false, 2, 2, maxAniso);
  const armorRoughness = finalizeTexture(armorRoughC, false, 2, 2, maxAniso);
  const hazardAlbedo = finalizeTexture(hazC, true, 3, 1, maxAniso);
  const containerBump = finalizeTexture(contC, false, 2, 1, maxAniso);

  return {
    deckAlbedo,
    deckRoughness,
    deckBump,
    deckNormal,
    rustMetalAlbedo,
    rustMetalRoughness,
    rustNormal,
    armorNormal,
    armorRoughness,
    hazardAlbedo,
    containerBump,
    shadowDisc,
    dispose: () => {
      deckAlbedo.dispose();
      deckRoughness.dispose();
      deckBump.dispose();
      deckNormal.dispose();
      rustMetalAlbedo.dispose();
      rustMetalRoughness.dispose();
      rustNormal.dispose();
      armorNormal.dispose();
      armorRoughness.dispose();
      hazardAlbedo.dispose();
      containerBump.dispose();
      shadowDisc.dispose();
    },
  };
}
