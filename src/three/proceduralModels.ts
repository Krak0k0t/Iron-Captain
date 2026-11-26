import * as THREE from 'three';
import type { ObstacleKind } from '../game/types';
import type { ProceduralTexturePack } from './proceduralTextures';

export interface HeroRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  coreMesh: THREE.Mesh;
  thrusterGlow: THREE.Mesh;
  beaconLight: THREE.Mesh;
  shadowDisc: THREE.Mesh;
}

export interface AssistDroneRig {
  group: THREE.Group;
  body: THREE.Group;
  rotorLeft: THREE.Object3D;
  rotorRight: THREE.Object3D;
  eyeMesh: THREE.Mesh;
}

export interface ArenaPickup {
  id: number;
  kind: 'hp' | 'energy';
  group: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  pos: THREE.Vector3;
  life: number;
  collected: boolean;
}

export interface GantryCraneRig {
  group: THREE.Group;
  trolley: THREE.Group;
  beamGroup: THREE.Group;
  hookGroup: THREE.Group;
  dropReticle: THREE.Mesh;
  cables: THREE.Mesh[];
  dropProgress: number; // 0 = hoisted, 1 = slammed
}

export interface EnemyRig {
  id: number;
  archetype: 'enforcer' | 'skimmer' | 'warden';
  group: THREE.Group;
  bodyGroup: THREE.Group;
  telegraphRing: THREE.Mesh;
  hitFlashTimer: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackCooldown: number;
  windupTimer: number;
  windupActive: boolean;
  koTimer: number; // > 0 when playing KO dissolve/topple
  dead: boolean;
  homePos: THREE.Vector3;
  orbitAngle: number;
  baseMaterialList: THREE.MeshStandardMaterial[];
}

export interface InteractableNode {
  id: string;
  label: string;
  isBypass: boolean;
  isLore?: boolean;
  group: THREE.Group;
  coreOrb: THREE.Mesh;
  leverPivot: THREE.Group;
  beaconSpire: THREE.Mesh;
  groundRing: THREE.Mesh;
  completed: boolean;
  leverProgress: number;
  position: THREE.Vector3;
}

export interface ArenaObstacle {
  kind: ObstacleKind;
  group: THREE.Group;
  hazardMesh: THREE.Object3D;
  telegraphMesh: THREE.Mesh;
  basePos: THREE.Vector3;
  axis: 'x' | 'z';
  phase: number;
  speed: number;
  activeHazard: boolean;
  hitRadius: number;
}

export function createContactShadow(shadowTex: THREE.CanvasTexture, radius = 0.85): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * Adds a lightweight inverted-hull silhouette shell for crisp Dendy-era readability against dark fog.
 */
function addOutlineShell(parent: THREE.Object3D, mesh: THREE.Mesh, colorHex: number, scaleFactor = 1.07): void {
  const outlineMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.72,
  });
  const shell = new THREE.Mesh(mesh.geometry, outlineMat);
  shell.position.copy(mesh.position);
  shell.rotation.copy(mesh.rotation);
  shell.scale.copy(mesh.scale).multiplyScalar(scaleFactor);
  parent.add(shell);
}

/**
 * 50+ part articulated Loader-Dispatcher Mk-IV Industrial Exosuit (Artem Garin — Iron Captain).
 * Wet gunmetal carapace, weathered hazard-orange safety plates, carbon-weave undersuit,
 * brushed titanium pistons, TubeGeometry hydraulic conduits, wrist terminal, and iridescent visor.
 * Every structural sub-mesh uses MeshPhysicalMaterial + Sobel tangent normal maps + micro-scratches
 * and casts/receives real-time shadows. Grounded at bottom-center pivot (y = 0).
 */
export function createHeroModel(textures: ProceduralTexturePack): HeroRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const armorMat = new THREE.MeshPhysicalMaterial({
    color: 0x2f3844,
    metalness: 0.84,
    roughness: 0.44,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: textures.armorRoughness,
    clearcoat: 0.36,
    clearcoatRoughness: 0.34,
    clearcoatNormalMap: textures.armorNormal,
    clearcoatNormalScale: new THREE.Vector2(0.6, 0.6),
    ior: 1.54,
    reflectivity: 0.76,
  });

  const hazardPlateMat = new THREE.MeshPhysicalMaterial({
    color: 0xd95d16,
    emissive: 0x2e1002,
    emissiveIntensity: 0.28,
    metalness: 0.62,
    roughness: 0.36,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: textures.armorRoughness,
    clearcoat: 0.55,
    clearcoatRoughness: 0.24,
    ior: 1.5,
  });

  const trimBrassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb88635,
    emissive: 0x2e1b04,
    emissiveIntensity: 0.22,
    metalness: 0.92,
    roughness: 0.28,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: textures.armorRoughness,
    clearcoat: 0.48,
    clearcoatRoughness: 0.2,
    ior: 1.52,
  });

  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xcbd5e1,
    metalness: 0.96,
    roughness: 0.14,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    ior: 1.6,
  });

  const suitMat = new THREE.MeshPhysicalMaterial({
    color: 0x16191f,
    metalness: 0.18,
    roughness: 0.78,
    sheen: 0.45,
    sheenRoughness: 0.66,
    sheenColor: new THREE.Color(0x3a424d),
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x84cc16,
    emissiveIntensity: 2.4,
    metalness: 0.12,
    roughness: 0.18,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffa438,
    emissive: 0xff6b1a,
    emissiveIntensity: 1.55,
    metalness: 0.2,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    iridescence: 0.85,
    iridescenceIOR: 1.35,
    ior: 1.54,
    reflectivity: 0.92,
  });

  // Helper to construct articulated armored leg pivoted at hip (y = 0.82)
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.21, 0.82, 0);

    // Ballistic thigh + beveled thigh carapace + outer piston cylinder
    const thighUnder = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.36, 12), suitMat);
    thighUnder.position.y = -0.18;
    legPivot.add(thighUnder);

    const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.31, 0.27), armorMat);
    thighPlate.position.set(side * 0.01, -0.17, -0.02);
    legPivot.add(thighPlate);

    const thighStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.28), hazardPlateMat);
    thighStripe.position.set(side * 0.11, -0.17, -0.02);
    legPivot.add(thighStripe);

    // Knee actuator + angled protective knee cap
    const kneeJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.25, 12), trimBrassMat);
    kneeJoint.rotation.z = Math.PI / 2;
    kneeJoint.position.set(0, -0.37, -0.02);
    legPivot.add(kneeJoint);

    const kneeCap = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.08), hazardPlateMat);
    kneeCap.position.set(0, -0.36, -0.15);
    kneeCap.rotation.x = -0.22;
    legPivot.add(kneeCap);

    // Greave shin armor + ankle hydraulic collar
    const shinPlate = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.34, 0.26), armorMat);
    shinPlate.position.set(0, -0.57, -0.01);
    legPivot.add(shinPlate);

    const calfPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.42, 8), chromeMat);
    calfPiston.position.set(0, -0.46, 0.13);
    calfPiston.rotation.x = 0.14;
    legPivot.add(calfPiston);

    // Rear curved hydraulic conduit hose (TubeGeometry)
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, -0.08, 0.12),
      new THREE.Vector3(side * 0.08, -0.32, 0.19),
      new THREE.Vector3(side * 0.04, -0.62, 0.14),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 10, 0.022, 6, false), suitMat);
    legPivot.add(hose);

    // Heavy magnetic dock boot + heel spur + steel toe cap (bottom sits cleanly at y = -0.82 => world y = 0)
    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.13, 0.38), trimBrassMat);
    bootSole.position.set(0, -0.755, -0.05);
    legPivot.add(bootSole);

    const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.16), hazardPlateMat);
    toeCap.position.set(0, -0.72, -0.2);
    legPivot.add(toeCap);

    const heelSpur = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.1), chromeMat);
    heelSpur.position.set(0, -0.75, 0.15);
    legPivot.add(heelSpur);

    return legPivot;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyPivot.add(leftLeg, rightLeg);

  // Pelvis frame, utility belt with clamp pouches, tassets & side grapple spools
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.38), suitMat);
  pelvis.position.set(0, 0.84, 0);
  bodyPivot.add(pelvis);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.45), armorMat);
  belt.position.set(0, 0.93, 0);
  bodyPivot.add(belt);

  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.07), hazardPlateMat);
  beltBuckle.position.set(0, 0.93, -0.24);
  bodyPivot.add(beltBuckle);

  for (const px of [-0.26, -0.14, 0.14, 0.26]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.08), suitMat);
    pouch.position.set(px, 0.92, -0.24);
    bodyPivot.add(pouch);
  }

  for (const s of [-1, 1] as const) {
    const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 0.31), armorMat);
    tasset.position.set(s * 0.36, 0.77, -0.02);
    tasset.rotation.z = -s * 0.14;
    bodyPivot.add(tasset);

    const tassetTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.32), hazardPlateMat);
    tassetTrim.position.set(s * 0.37, 0.67, -0.02);
    tassetTrim.rotation.z = -s * 0.14;
    bodyPivot.add(tassetTrim);

    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12), chromeMat);
    spool.rotation.x = Math.PI / 2;
    spool.position.set(s * 0.41, 0.93, 0);
    bodyPivot.add(spool);
  }

  // Tapered armored torso carapace + collar guard + twin heavy crane lifting D-rings
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.66, 10), armorMat);
  torso.scale.set(1.04, 1.0, 0.66);
  torso.position.set(0, 1.31, 0);
  bodyPivot.add(torso);

  const chestGuard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.5), armorMat);
  chestGuard.position.set(0, 1.42, -0.04);
  bodyPivot.add(chestGuard);

  const upperSternumPlate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.52), hazardPlateMat);
  upperSternumPlate.position.set(0, 1.56, -0.05);
  bodyPivot.add(upperSternumPlate);

  const collarRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 18), trimBrassMat);
  collarRim.rotation.x = Math.PI / 2;
  collarRim.position.set(0, 1.65, -0.02);
  bodyPivot.add(collarRim);

  for (const s of [-1, 1] as const) {
    const hoistRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 12), chromeMat);
    hoistRing.position.set(s * 0.25, 1.68, -0.14);
    hoistRing.rotation.y = Math.PI / 2;
    bodyPivot.add(hoistRing);
  }

  // Recessed Hydrogen Arc Reactor Core + 4-bar brass/steel protective cage
  const coreHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.195, 0.12, 16), trimBrassMat);
  coreHousing.rotation.x = Math.PI / 2;
  coreHousing.position.set(0, 1.35, -0.26);
  bodyPivot.add(coreHousing);

  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 16), coreMat);
  coreMesh.rotation.x = Math.PI / 2;
  coreMesh.position.set(0, 1.35, -0.27);
  bodyPivot.add(coreMesh);

  for (const barAngle of [0, Math.PI / 2]) {
    const cageBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.03), chromeMat);
    cageBar.position.set(0, 1.35, -0.35);
    cageBar.rotation.z = barAngle + Math.PI / 4;
    bodyPivot.add(cageBar);
  }

  // Articulated L4-L5 External Dorsal Spine Brace (5 vertebrae) + Dual-Turbine Hydrogen Backpack
  for (let v = 0; v < 5; v++) {
    const vertebra = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.085, 0.14), v === 1 ? hazardPlateMat : chromeMat);
    vertebra.position.set(0, 1.0 + v * 0.125, 0.25);
    bodyPivot.add(vertebra);
  }

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.54, 0.22), armorMat);
  backpack.position.set(0, 1.36, 0.32);
  bodyPivot.add(backpack);

  const tankBand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.24), hazardPlateMat);
  tankBand.position.set(0, 1.44, 0.32);
  bodyPivot.add(tankBand);

  for (const s of [-1, 1] as const) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.38, 12), trimBrassMat);
    pod.position.set(s * 0.2, 1.38, 0.43);
    pod.rotation.x = 0.22;
    bodyPivot.add(pod);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.115, 0.14, 12), chromeMat);
    nozzle.position.set(s * 0.2, 1.17, 0.47);
    nozzle.rotation.x = 0.22;
    bodyPivot.add(nozzle);

    // Braided hydrogen conduit tube from backpack pod into shoulder manifold
    const feedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.2, 1.56, 0.4),
      new THREE.Vector3(s * 0.34, 1.66, 0.28),
      new THREE.Vector3(s * 0.4, 1.56, 0.12),
    ]);
    const feedTube = new THREE.Mesh(new THREE.TubeGeometry(feedCurve, 10, 0.025, 6, false), chromeMat);
    bodyPivot.add(feedTube);
  }

  const thrusterGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.72 }),
  );
  thrusterGlow.position.set(0, 1.15, 0.49);
  thrusterGlow.userData.noShadow = true;
  bodyPivot.add(thrusterGlow);

  // Multi-layer hazard-orange shoulder pauldrons + amber strobe beacon
  for (const s of [-1, 1] as const) {
    const innerPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.44), armorMat);
    innerPauldron.position.set(s * 0.52, 1.56, 0);
    innerPauldron.rotation.z = -s * 0.22;
    bodyPivot.add(innerPauldron);

    const crestPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.41), hazardPlateMat);
    crestPauldron.position.set(s * 0.54, 1.66, 0);
    crestPauldron.rotation.z = -s * 0.24;
    bodyPivot.add(crestPauldron);
  }

  const beaconStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.17, 8), chromeMat);
  beaconStem.position.set(0.47, 1.77, 0.12);
  bodyPivot.add(beaconStem);

  const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), visorMat);
  beaconLight.position.set(0.47, 1.87, 0.12);
  bodyPivot.add(beaconLight);

  // Helper to construct articulated arms pivoted at shoulders (y = 1.50)
  const buildArm = (side: -1 | 1): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.54, 1.5, 0);

    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.28, 12), suitMat);
    bicep.position.y = -0.14;
    armPivot.add(bicep);

    const bicepGuard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.24), armorMat);
    bicepGuard.position.set(side * 0.02, -0.14, 0);
    armPivot.add(bicepGuard);

    const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 12), trimBrassMat);
    elbow.rotation.z = Math.PI / 2;
    elbow.position.set(0, -0.3, 0);
    armPivot.add(elbow);

    if (side === 1) {
      // Right Arm: Heavy Industrial Power Gauntlet + hydraulic ram + capacitor strip + twin arc prongs
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.3), armorMat);
      gauntlet.position.set(0.02, -0.5, -0.04);
      armPivot.add(gauntlet);

      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.29), hazardPlateMat);
      knuckle.position.set(0.02, -0.66, -0.05);
      armPivot.add(knuckle);

      const armPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.32, 8), chromeMat);
      armPiston.position.set(0.13, -0.45, 0.08);
      armPivot.add(armPiston);

      const coilStrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.06), coreMat);
      coilStrip.position.set(0.15, -0.49, -0.06);
      armPivot.add(coilStrip);

      for (const px of [-0.07, 0.09]) {
        const prong = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.08), chromeMat);
        prong.position.set(px, -0.73, -0.12);
        armPivot.add(prong);
      }
    } else {
      // Left Arm: Forearm armor + Magnetic Cargo Sling Winch Drum + Wrist Holo-Terminal
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.24), armorMat);
      forearm.position.set(-0.01, -0.49, -0.02);
      armPivot.add(forearm);

      const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), trimBrassMat);
      winchDrum.rotation.z = Math.PI / 2;
      winchDrum.position.set(-0.12, -0.48, -0.06);
      armPivot.add(winchDrum);

      const cableCoil = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.02, 6, 14), chromeMat);
      cableCoil.rotation.y = Math.PI / 2;
      cableCoil.position.set(-0.12, -0.48, -0.06);
      armPivot.add(cableCoil);

      const wristPadFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.16), trimBrassMat);
      wristPadFrame.position.set(0.09, -0.5, -0.02);
      armPivot.add(wristPadFrame);

      const wristScreen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.12), coreMat);
      wristScreen.position.set(0.12, -0.5, -0.02);
      armPivot.add(wristScreen);

      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), suitMat);
      fist.position.set(-0.01, -0.68, -0.02);
      armPivot.add(fist);
    }

    return armPivot;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyPivot.add(leftArm, rightArm);

  // Welding/Dispatcher Helmet + Armored Brow Hood + Twin Respirator Filter Pods + Whip Antenna
  const helmDome = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 0.36, 16), armorMat);
  helmDome.position.set(0, 1.88, 0);
  bodyPivot.add(helmDome);

  const helmCrown = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), armorMat);
  helmCrown.position.set(0, 2.04, 0);
  bodyPivot.add(helmCrown);

  const helmCrest = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.38), hazardPlateMat);
  helmCrest.position.set(0, 2.13, 0.02);
  bodyPivot.add(helmCrest);

  const browHood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.18), hazardPlateMat);
  browHood.position.set(0, 2.0, -0.18);
  browHood.rotation.x = 0.25;
  bodyPivot.add(browHood);

  const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.18), trimBrassMat);
  chinGuard.position.set(0, 1.75, -0.17);
  bodyPivot.add(chinGuard);

  for (const s of [-1, 1] as const) {
    const earPod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 12), trimBrassMat);
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(s * 0.26, 1.88, 0);
    bodyPivot.add(earPod);

    const respirator = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.11, 10), chromeMat);
    respirator.rotation.x = Math.PI / 2;
    respirator.position.set(s * 0.14, 1.78, -0.24);
    bodyPivot.add(respirator);
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 6), chromeMat);
  antenna.position.set(-0.27, 2.1, 0.04);
  bodyPivot.add(antenna);

  // Curved polycarbonate welding visor facing -Z
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.246, 0.254, 0.125, 18, 1, false, Math.PI * 0.66, Math.PI * 0.68),
    visorMat,
  );
  visor.position.set(0, 1.9, -0.01);
  bodyPivot.add(visor);

  // Enforce real-time directional shadow casting & receiving across every structural exosuit sub-mesh
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.noShadow) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const shadowDisc = createContactShadow(textures.shadowDisc, 1.0);
  shadowDisc.userData.noShadow = true;
  group.add(shadowDisc);

  return {
    group,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    coreMesh,
    thrusterGlow,
    beaconLight,
    shadowDisc,
  };
}

/**
 * Proposal #5: Field Companion Assist Drone ("Yaga-Welder Mk-I") orbiting Artem's flank.
 * Uses MeshPhysicalMaterial + armorNormal/armorRoughness + phosphor scanner eye + twin spinning rotors.
 */
export function createAssistDrone(textures: ProceduralTexturePack): AssistDroneRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x353d47,
    metalness: 0.85,
    roughness: 0.36,
    normalMap: textures.armorNormal,
    roughnessMap: textures.armorRoughness,
    clearcoat: 0.45,
  });
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: 0xd95d16,
    metalness: 0.6,
    roughness: 0.35,
    clearcoat: 0.5,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x84cc16,
    emissiveIntensity: 2.5,
    roughness: 0.15,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.9,
    roughness: 0.25,
  });

  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.24, 12), chassisMat);
  body.add(pod);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.05;
  body.add(collar);

  const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), eyeMat);
  eyeMesh.position.set(0, -0.02, -0.2);
  body.add(eyeMesh);

  const weldArm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.24, 8), bladeMat);
  weldArm.position.set(0, -0.18, -0.06);
  weldArm.rotation.x = 0.35;
  body.add(weldArm);

  const makeRotor = (sx: number): THREE.Group => {
    const r = new THREE.Group();
    r.position.set(sx * 0.32, 0.14, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.04), chassisMat);
    arm.position.set(-sx * 0.12, -0.04, 0);
    body.add(arm);

    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.045), bladeMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.32), bladeMat);
    r.add(blade1, blade2);
    body.add(r);
    return r;
  };

  const rotorLeft = makeRotor(-1);
  const rotorRight = makeRotor(1);

  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  return { group, body, rotorLeft, rotorRight, eyeMesh };
}

/**
 * 10-part composite freighter "Polina L." — the crew's rusty floating fortress.
 */
export function createPolinaShip(textures: ProceduralTexturePack): THREE.Group {
  const ship = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    map: textures.rustMetalAlbedo,
    roughnessMap: textures.rustMetalRoughness,
    normalMap: textures.rustNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.72,
    metalness: 0.65,
    color: 0xffffff,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    map: textures.deckAlbedo,
    roughnessMap: textures.deckRoughness,
    normalMap: textures.deckNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.65,
    metalness: 0.4,
    color: 0xffffff,
  });
  const rustTrimMat = new THREE.MeshStandardMaterial({
    color: 0x8d3d22,
    roughness: 0.85,
    metalness: 0.35,
  });
  const cabinLightMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });

  // 1. Main steel hull (tapered ExtrudeGeometry)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-14, -4.2);
  hullShape.lineTo(10, -4.2);
  hullShape.lineTo(16, 0);
  hullShape.lineTo(10, 4.2);
  hullShape.lineTo(-14, 4.2);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 5.5,
    bevelEnabled: true,
    bevelThickness: 0.45,
    bevelSize: 0.35,
    bevelSegments: 2,
  });
  hullGeo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);

  // 2. Reddish anti-fouling lower belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 8.8), rustTrimMat);
  belt.position.set(-1.5, 0.9, 0);
  ship.add(belt);

  // 3. Main freight deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 8.1), deckMat);
  deck.position.set(-1.5, 5.7, 0);
  deck.receiveShadow = true;
  ship.add(deck);

  // 4. Aft bridge superstructure
  const bridgeBase = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.8, 6.8), hullMat);
  bridgeBase.position.set(-9.5, 8.1, 0);
  bridgeBase.castShadow = true;
  ship.add(bridgeBase);

  const bridgeTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 7.6), hullMat);
  bridgeTop.position.set(-9.2, 11.4, 0);
  bridgeTop.castShadow = true;
  ship.add(bridgeTop);

  // 5. Glowing bridge windows
  const windows = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 6.2), cabinLightMat);
  windows.position.set(-6.8, 11.4, 0);
  ship.add(windows);

  // 6. Smokestack funnel
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 4.2, 14), rustTrimMat);
  funnel.position.set(-11.2, 12.2, 0);
  funnel.castShadow = true;
  ship.add(funnel);

  // 7. Forward mast + beacon
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 9.5, 10), hullMat);
  mast.position.set(8.5, 10.4, 0);
  ship.add(mast);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 3.0,
    }),
  );
  beacon.position.set(8.5, 15.2, 0);
  ship.add(beacon);

  // 8. Cargo hatch covers
  for (let i = 0; i < 2; i++) {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 5.0), rustTrimMat);
    hatch.position.set(-1.5 + i * 6.5, 6.3, 0);
    hatch.castShadow = true;
    ship.add(hatch);
  }

  return ship;
}

/**
 * Distance-scaled THREE.LOD wrapper for drifting Hydrogen Airships.
 */
export function createAirshipLOD(textures: ProceduralTexturePack): THREE.LOD {
  const lod = new THREE.LOD();
  lod.addLevel(createHydrogenAirship(textures), 0);

  const low = new THREE.Group();
  const lowEnv = new THREE.Mesh(
    new THREE.BoxGeometry(16, 5.4, 5.4),
    new THREE.MeshStandardMaterial({ color: 0x454d59, roughness: 0.78 }),
  );
  const lowGondola = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.2, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xd4a448, metalness: 0.85 }),
  );
  lowGondola.position.y = -3.1;
  low.add(lowEnv, lowGondola);
  lod.addLevel(low, 62);
  return lod;
}

/**
 * Distance-scaled THREE.LOD wrapper for Polina L. (full beveled ship up close, lightweight hull far away).
 */
export function createPolinaShipLOD(textures: ProceduralTexturePack): THREE.LOD {
  const lod = new THREE.LOD();
  const hi = createPolinaShip(textures);
  lod.addLevel(hi, 0);

  const lowGroup = new THREE.Group();
  const lowHullMat = new THREE.MeshStandardMaterial({ color: 0x525c68, roughness: 0.78, metalness: 0.55 });
  const lowTrimMat = new THREE.MeshStandardMaterial({ color: 0x8d3d22, roughness: 0.85, metalness: 0.35 });
  const lowBody = new THREE.Mesh(new THREE.BoxGeometry(28, 5.5, 8.2), lowHullMat);
  lowBody.position.set(0, 2.75, 0);
  const lowBridge = new THREE.Mesh(new THREE.BoxGeometry(6.5, 6.2, 7.0), lowHullMat);
  lowBridge.position.set(-9.5, 8.2, 0);
  const lowFunnel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.0, 2.2), lowTrimMat);
  lowFunnel.position.set(-11.2, 12.0, 0);
  lowGroup.add(lowBody, lowBridge, lowFunnel);
  lod.addLevel(lowGroup, 48);

  return lod;
}

/**
 * Interactive 9-part Gantry Crane with animated 40-ton steel girder, glowing crane hook,
 * and ground impact reticle for "Crane Moment".
 */
export function createGantryCrane(textures: ProceduralTexturePack): GantryCraneRig {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshPhysicalMaterial({
    map: textures.hazardAlbedo,
    normalMap: textures.rustNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.armorRoughness,
    roughness: 0.44,
    metalness: 0.76,
    clearcoat: 0.35,
    clearcoatRoughness: 0.32,
    color: 0xffffff,
  });
  const darkIronMat = new THREE.MeshPhysicalMaterial({
    color: 0x222832,
    normalMap: textures.armorNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: textures.armorRoughness,
    roughness: 0.56,
    metalness: 0.84,
    clearcoat: 0.25,
  });
  const hookBeaconMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.88,
    clearcoat: 0.65,
  });

  // 4 lattice legs
  const legGeo = new THREE.BoxGeometry(0.75, 12, 0.75);
  const legOffsets = [
    [-6, -4],
    [6, -4],
    [-6, 4],
    [6, 4],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, darkIronMat);
    leg.position.set(lx, 6, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Overhead gantry rails
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.1, 9.2), steelMat);
  rail.position.set(0, 12.2, 0);
  rail.castShadow = true;
  group.add(rail);

  const trolley = new THREE.Group();
  trolley.position.set(0, 11.4, 0);
  group.add(trolley);

  const trolleyBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 2.2), darkIronMat);
  trolley.add(trolleyBox);

  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, 6.5, 0);
  group.add(beamGroup);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.15, 1.45), steelMat);
  beam.castShadow = true;
  beamGroup.add(beam);
  addOutlineShell(beamGroup, beam, 0xf2cb77, 1.04);

  // Heavy Crane Hook & Warning Beacon hanging from beam center
  const hookGroup = new THREE.Group();
  hookGroup.position.set(0, -0.95, 0);
  beamGroup.add(hookGroup);

  const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.75), hookBeaconMat);
  hookGroup.add(hookBlock);

  const hookJ = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.13, 8, 16, Math.PI * 1.35), hookBeaconMat);
  hookJ.position.y = -0.62;
  hookJ.rotation.z = Math.PI * 0.8;
  hookGroup.add(hookJ);

  // Ground drop reticle beneath crane beam
  const retGeo = new THREE.RingGeometry(2.3, 2.8, 28);
  retGeo.rotateX(-Math.PI / 2);
  const retMat = new THREE.MeshBasicMaterial({
    color: 0xf2cb77,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const dropReticle = new THREE.Mesh(retGeo, retMat);
  dropReticle.position.set(0, 0.04, 0);
  group.add(dropReticle);

  const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.0, 6);
  const cables: THREE.Mesh[] = [];
  for (const cx of [-2.2, 2.2]) {
    const cable = new THREE.Mesh(cableGeo, darkIronMat);
    cable.position.set(cx, 9.0, 0);
    group.add(cable);
    cables.push(cable);
  }

  return {
    group,
    trolley,
    beamGroup,
    hookGroup,
    dropReticle,
    cables,
    dropProgress: 0,
  };
}

/**
 * Creates one of 3 distinct enemy archetypes with crisp Dendy silhouette rim,
 * telegraph ring, and contact shadow.
 */
export function createEnemyModel(
  id: number,
  archetype: 'enforcer' | 'skimmer' | 'warden',
  textures: ProceduralTexturePack,
  maxHp: number,
): EnemyRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const mats: THREE.MeshStandardMaterial[] = [];

  if (archetype === 'enforcer') {
    const armor = new THREE.MeshPhysicalMaterial({
      color: 0xb2322d,
      metalness: 0.72,
      roughness: 0.42,
      normalMap: textures.armorNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: textures.armorRoughness,
      clearcoat: 0.35,
    });
    const dark = new THREE.MeshPhysicalMaterial({
      color: 0x1c1e24,
      metalness: 0.48,
      roughness: 0.68,
      normalMap: textures.armorNormal,
    });
    const eye = new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      emissive: 0xff4020,
      emissiveIntensity: 2.5,
    });
    mats.push(armor, dark, eye);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.15, 0.62), armor);
    torso.position.y = 1.05;
    bodyGroup.add(torso);
    addOutlineShell(bodyGroup, torso, 0xff5a3c, 1.08);

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.6, 0.42), dark);
    legs.position.y = 0.3;
    bodyGroup.add(legs);

    const maul = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), dark);
    maul.position.set(0.62, 1.0, -0.25);
    bodyGroup.add(maul);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.2), eye);
    visor.position.set(0, 1.72, -0.22);
    bodyGroup.add(visor);
  } else if (archetype === 'skimmer') {
    const shell = new THREE.MeshPhysicalMaterial({
      color: 0x353e4e,
      metalness: 0.88,
      roughness: 0.28,
      normalMap: textures.armorNormal,
      roughnessMap: textures.armorRoughness,
      clearcoat: 0.55,
    });
    const lens = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.8,
    });
    mats.push(shell, lens);

    const pod = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), shell);
    pod.position.y = 1.65;
    bodyGroup.add(pod);
    addOutlineShell(bodyGroup, pod, 0xf59e0b, 1.09);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.13, 0.34), shell);
    wingL.position.set(-0.7, 1.72, 0);
    bodyGroup.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.13, 0.34), shell);
    wingR.position.set(0.7, 1.72, 0);
    bodyGroup.add(wingR);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), lens);
    eye.position.set(0, 1.65, -0.45);
    bodyGroup.add(eye);
  } else {
    // Duty-Bot Warden (tall cobalt-and-gold shielded charger)
    const cobalt = new THREE.MeshPhysicalMaterial({
      color: 0x254b8c,
      metalness: 0.85,
      roughness: 0.28,
      normalMap: textures.armorNormal,
      roughnessMap: textures.armorRoughness,
      clearcoat: 0.5,
    });
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xf2cb77,
      metalness: 0.94,
      roughness: 0.2,
      normalMap: textures.armorNormal,
      clearcoat: 0.65,
    });
    const beam = new THREE.MeshStandardMaterial({
      color: 0x60efff,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.8,
    });
    mats.push(cobalt, gold, beam);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 1.9, 10), cobalt);
    pillar.position.y = 0.95;
    bodyGroup.add(pillar);
    addOutlineShell(bodyGroup, pillar, 0x38bdf8, 1.08);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 8, 20), gold);
    halo.position.y = 1.75;
    halo.rotation.x = Math.PI / 2;
    bodyGroup.add(halo);

    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.14), gold);
    shield.position.set(0, 1.05, -0.58);
    bodyGroup.add(shield);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), beam);
    core.position.set(0, 1.95, 0);
    bodyGroup.add(core);
  }

  bodyGroup.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && (mesh.material as THREE.Material).type !== 'MeshBasicMaterial') {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  // Ground telegraph ring (visible when winding up attack)
  const ringGeo = new THREE.RingGeometry(1.1, 1.48, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff453a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(ringGeo, ringMat);
  telegraphRing.position.y = 0.05;
  group.add(telegraphRing);

  group.add(createContactShadow(textures.shadowDisc, archetype === 'warden' ? 1.15 : 0.85));

  return {
    id,
    archetype,
    group,
    bodyGroup,
    telegraphRing,
    hitFlashTimer: 0,
    hp: maxHp,
    maxHp,
    speed: archetype === 'skimmer' ? 5.2 : archetype === 'enforcer' ? 4.1 : 3.3,
    attackCooldown: 1.2 + Math.random() * 1.2,
    windupTimer: 0,
    windupActive: false,
    koTimer: 0,
    dead: false,
    homePos: new THREE.Vector3(),
    orbitAngle: Math.random() * Math.PI * 2,
    baseMaterialList: mats,
  };
}

/**
 * High-contrast Cargo Crate / Dispatch Lever Console / Bypass Terminal with light spire
 * and ground halo so objectives read instantly even on mobile screens.
 */
export function createInteractableNode(
  id: string,
  label: string,
  pos: THREE.Vector3,
  accentHex: number,
  isSoftwareGl: boolean,
  isBypass = false,
): InteractableNode {
  const group = new THREE.Group();
  group.position.copy(pos);

  const baseMat = new THREE.MeshStandardMaterial({
    color: isBypass ? 0x3b2f18 : 0x262e3a,
    metalness: 0.76,
    roughness: 0.42,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.2,
    metalness: 0.6,
    roughness: 0.3,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.9,
    roughness: 0.14,
    metalness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.9 : 1,
    ior: 1.5,
    thickness: 0.6,
    clearcoat: 1.0,
  });

  // Heavy steel cargo crate plinth
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.82, 1.32), baseMat);
  crate.position.y = 0.41;
  crate.castShadow = true;
  group.add(crate);
  addOutlineShell(group, crate, accentHex, 1.06);

  // Glowing horizontal relay strip around crate
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 1.38), trimMat);
  belt.position.y = 0.44;
  group.add(belt);

  // Mechanical lever switch on front side
  const leverPivot = new THREE.Group();
  leverPivot.position.set(0, 0.82, 0.32);
  leverPivot.rotation.x = -0.52;
  group.add(leverPivot);

  const leverArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.72, 6), baseMat);
  leverArm.position.y = 0.34;
  leverPivot.add(leverArm);

  const leverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.12), trimMat);
  leverHandle.position.y = 0.7;
  leverPivot.add(leverHandle);

  // Floating dispatch core orb
  const coreOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), glassMat);
  coreOrb.position.y = 1.65;
  group.add(coreOrb);

  // Vertical beacon light spire (makes POI unmistakable through fog)
  const spireGeo = new THREE.CylinderGeometry(0.08, 0.42, 7.5, 10, 1, true);
  const spireMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: isBypass ? 0.22 : 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beaconSpire = new THREE.Mesh(spireGeo, spireMat);
  beaconSpire.position.y = 3.85;
  group.add(beaconSpire);

  // Pulsing ground target ring
  const ringGeo = new THREE.RingGeometry(1.15, 1.45, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const groundRing = new THREE.Mesh(ringGeo, ringMat);
  groundRing.position.y = 0.04;
  group.add(groundRing);

  return {
    id,
    label,
    isBypass,
    isLore: false,
    group,
    coreOrb,
    leverPivot,
    beaconSpire,
    groundRing,
    completed: false,
    leverProgress: 0,
    position: pos.clone(),
  };
}

/**
 * Distinct violet-and-gold Black-Box Lore Beacon holo-terminal for optional in-arena story logs.
 */
export function createLoreBeaconNode(
  id: string,
  label: string,
  pos: THREE.Vector3,
  isSoftwareGl: boolean,
): InteractableNode {
  const node = createInteractableNode(id, label, pos, 0xa78bfa, isSoftwareGl, false);
  node.isLore = true;
  return node;
}

/**
 * Builds one of 4 physical/timing obstacles for unified Chapter Blueprints.
 */
export function createArenaObstacle(
  kind: ObstacleKind,
  pos: THREE.Vector3,
  axis: 'x' | 'z',
  phase: number,
  speed: number,
  textures: ProceduralTexturePack,
): ArenaObstacle {
  const group = new THREE.Group();
  group.position.copy(pos);

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x262d38,
    metalness: 0.78,
    roughness: 0.4,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: textures.hazardAlbedo,
    roughness: 0.45,
    metalness: 0.65,
  });

  const ringGeo = new THREE.RingGeometry(1.6, 2.05, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphMesh = new THREE.Mesh(ringGeo, telegraphMat);
  telegraphMesh.position.y = 0.04;
  group.add(telegraphMesh);

  let hazardMesh: THREE.Object3D;
  let hitRadius = 1.9;

  if (kind === 'steam_vent') {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.32, 10), ironMat);
    valve.position.y = 0.16;
    group.add(valve);

    const jetGeo = new THREE.CylinderGeometry(0.45, 0.95, 4.2, 10, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0xff9f43,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const jet = new THREE.Mesh(jetGeo, jetMat);
    jet.position.y = 2.1;
    group.add(jet);
    hazardMesh = jet;
    hitRadius = 1.85;
  } else if (kind === 'swinging_beam') {
    const pivot = new THREE.Group();
    pivot.position.y = 8.0;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.4, 8), ironMat);
    arm.position.y = -3.2;
    pivot.add(arm);
    const weight = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.3), hazardMat);
    weight.position.y = -6.5;
    weight.castShadow = true;
    pivot.add(weight);
    group.add(pivot);
    hazardMesh = pivot;
    hitRadius = 2.1;
  } else if (kind === 'moving_press') {
    const sled = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.2), hazardMat);
    sled.position.y = 0.85;
    sled.castShadow = true;
    addOutlineShell(sled, sled, 0xf59e0b, 1.04);
    group.add(sled);
    hazardMesh = sled;
    hitRadius = 1.95;
  } else {
    // laser_cordon
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 8), ironMat);
    pylon.position.y = 1.1;
    group.add(pylon);

    const barGroup = new THREE.Group();
    barGroup.position.y = 1.15;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 0.18), beamMat);
    barGroup.add(bar);
    group.add(barGroup);
    hazardMesh = barGroup;
    hitRadius = 3.5;
  }

  return {
    kind,
    group,
    hazardMesh,
    telegraphMesh,
    basePos: pos.clone(),
    axis,
    phase,
    speed,
    activeHazard: false,
    hitRadius,
  };
}

/**
 * Multi-part Hydrogen Airship drifting across the misty archipelago horizon.
 */
export function createHydrogenAirship(textures: ProceduralTexturePack): THREE.Group {
  const ship = new THREE.Group();
  const envelopeMat = new THREE.MeshStandardMaterial({
    color: 0x454d59,
    roughness: 0.75,
    metalness: 0.25,
    bumpMap: textures.containerBump,
    bumpScale: 0.08,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a448,
    metalness: 0.88,
    roughness: 0.28,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.9,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.2, 18, 12), envelopeMat);
  body.scale.set(2.8, 0.95, 1.0);
  ship.add(body);

  const finV = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.2), brassMat);
  finV.position.set(-7.5, 0, 0);
  ship.add(finV);

  const gondola = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 1.4), brassMat);
  gondola.position.set(0, -3.2, 0);
  ship.add(gondola);

  const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 1.5), glowMat);
  lamp.position.set(0, -3.2, 0);
  ship.add(lamp);

  return ship;
}

/**
 * Collectible Hydrogen Battery or Hull Weld Cell dropped by defeated enemies.
 */
export function createArenaPickup(
  id: number,
  kind: 'hp' | 'energy',
  pos: THREE.Vector3,
): ArenaPickup {
  const accent = kind === 'hp' ? 0x34d399 : 0x38bdf8;
  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.3,
    }),
  );
  core.position.y = 0.65;
  group.add(core);
  addOutlineShell(group, core, 0xf2cb77, 1.14);

  const ringGeo = new THREE.RingGeometry(0.55, 0.72, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.position.y = 0.04;
  group.add(ring);

  return {
    id,
    kind,
    group,
    core,
    ring,
    pos: group.position,
    life: 16,
    collected: false,
  };
}

/**
 * Distant Archipelago & Industrial Crane silhouettes framing the harbor horizon (2 instanced draw calls).
 */
export function createDistantHarborRing(): THREE.Group {
  const ring = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x16202e,
    roughness: 0.92,
    metalness: 0.15,
  });
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.75,
  });

  const towerGeo = new THREE.BoxGeometry(8, 22, 8);
  const towerCount = 14;
  const towers = new THREE.InstancedMesh(towerGeo, rockMat, towerCount);
  const beaconGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, towerCount);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < towerCount; i++) {
    const ang = (i / towerCount) * Math.PI * 2 + 0.2;
    const dist = 84 + (i % 3) * 16;
    const hScale = 0.75 + (i % 4) * 0.42;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    p.set(x, 11 * hScale - 3, z);
    q.setFromAxisAngle(up, ang * 1.7);
    s.set(1.2 + (i % 3) * 0.6, hScale, 1 + (i % 2) * 0.8);
    m.compose(p, q, s);
    towers.setMatrixAt(i, m);

    p.set(x, 22 * hScale - 2.2, z);
    s.set(1, 1, 1);
    m.compose(p, q, s);
    beacons.setMatrixAt(i, m);
  }
  towers.instanceMatrix.needsUpdate = true;
  beacons.instanceMatrix.needsUpdate = true;
  ring.add(towers, beacons);
  return ring;
}

/**
 * Safely disposes geometries and materials of a temporary 3D subtree without touching shared textures.
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !geos.has(mesh.geometry)) {
      mesh.geometry.dispose();
      geos.add(mesh.geometry);
    }
    if (mesh.material) {
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) {
        if (!mats.has(m)) {
          m.dispose();
          mats.add(m);
        }
      }
    }
  });
}

