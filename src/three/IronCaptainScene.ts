import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  computeCameraMovementVector,
  computeCombatDamage,
  computeComboMultiplier,
  computeDashVector,
  computeOverchargeBonus,
  computeSubQuestBonus,
  evaluateCraneBalanceDrop,
} from '../game/rules';
import { SECTOR_LORE_CODEX } from '../game/storyData';
import type {
  ArenaTheme,
  ChapterBlueprint,
  ChapterId,
  DifficultyLevel,
  GameModeState,
  GraphicsQuality,
  HudSnapshot,
  Keybindings,
  PartyMemberId,
  RelicBonuses,
} from '../game/types';
import { soundEngine } from '../audio/soundEngine';
import { createProceduralTexturePack, type ProceduralTexturePack } from './proceduralTextures';
import {
  createAirshipLOD,
  createArenaObstacle,
  createArenaPickup,
  createAssistDrone,
  createDistantHarborRing,
  createEnemyModel,
  createGantryCrane,
  createHeroModel,
  createInteractableNode,
  createLoreBeaconNode,
  createPolinaShipLOD,
  disposeObjectTree,
  type ArenaObstacle,
  type ArenaPickup,
  type AssistDroneRig,
  type EnemyRig,
  type GantryCraneRig,
  type HeroRig,
  type InteractableNode,
} from './proceduralModels';

export interface SceneCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onChapterObjectivesCleared: () => void;
  onPlayerDefeated: () => void;
  onPauseRequested: () => void;
  onInteractBonusAK: (ak: number) => void;
  onLoreUnlocked?: (chapterId: ChapterId, crewMember: PartyMemberId) => void;
}

interface SparkParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

interface DebrisParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

interface ProjectileBolt {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  active: boolean;
}

interface FloatingWorldText {
  id: number;
  worldPos: THREE.Vector3;
  text: string;
  color: string;
  life: number;
}

interface ThemePalette {
  bg: number;
  fogColor: number;
  fogDensity: number;
  keyColor: number;
  keyIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  waterColor: number;
  godRayColor: number;
  nodeAccent: number;
}

const THEME_PALETTES: Record<ArenaTheme, ThemePalette> = {
  basement: {
    bg: 0x0b0f17,
    fogColor: 0x0e1420,
    fogDensity: 0.017,
    keyColor: 0xffb366,
    keyIntensity: 2.3,
    hemiSky: 0x3b5878,
    hemiGround: 0x1a1512,
    hemiIntensity: 0.75,
    waterColor: 0x09131d,
    godRayColor: 0xffc570,
    nodeAccent: 0xf59e0b,
  },
  port_gravel: {
    bg: 0x101824,
    fogColor: 0x142030,
    fogDensity: 0.013,
    keyColor: 0xffcf87,
    keyIntensity: 2.7,
    hemiSky: 0x5c80a6,
    hemiGround: 0x241c15,
    hemiIntensity: 0.85,
    waterColor: 0x0b2030,
    godRayColor: 0xffd58a,
    nodeAccent: 0x38bdf8,
  },
  ring_masts: {
    bg: 0x141726,
    fogColor: 0x1a1d32,
    fogDensity: 0.012,
    keyColor: 0xffd996,
    keyIntensity: 2.9,
    hemiSky: 0x6f7eb8,
    hemiGround: 0x261d19,
    hemiIntensity: 0.9,
    waterColor: 0x0f1b2e,
    godRayColor: 0xffe09e,
    nodeAccent: 0xf59e0b,
  },
  abyssal_archive: {
    bg: 0x061119,
    fogColor: 0x081824,
    fogDensity: 0.02,
    keyColor: 0x74d8ff,
    keyIntensity: 2.1,
    hemiSky: 0x1e5b78,
    hemiGround: 0x08131a,
    hemiIntensity: 0.7,
    waterColor: 0x040f17,
    godRayColor: 0x38bdf8,
    nodeAccent: 0x34d399,
  },
  zero_mooring: {
    bg: 0x16121c,
    fogColor: 0x1d1826,
    fogDensity: 0.011,
    keyColor: 0xffe19c,
    keyIntensity: 3.1,
    hemiSky: 0x808bc2,
    hemiGround: 0x291a16,
    hemiIntensity: 0.95,
    waterColor: 0x101829,
    godRayColor: 0xffe59d,
    nodeAccent: 0xf2cb77,
  },
};

// Module-level scratch vectors/matrices (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _ftOffset = new THREE.Vector3();

const DEFAULT_RELIC_BONUSES: RelicBonuses = {
  moveSpeedMult: 1,
  maxHpBonus: 0,
  craneCooldownMult: 1,
  craneDamageMult: 1,
  craneRadiusBonus: 0,
  grappleCooldownMult: 1,
  slamCooldownMult: 1,
  interactRangeBonus: 0,
  bonusAkMult: 1,
  unlockedBypasses: [],
  ownedRelics: [],
};

export class IronCaptainScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private lastTimeMs = performance.now();
  private elapsedSec = 0;

  private textures: ProceduralTexturePack;
  private arenaGroup = new THREE.Group();
  private hero: HeroRig;
  private assistDrone: AssistDroneRig;
  private polinaShip: THREE.LOD;
  private crane: GantryCraneRig;
  private airships: THREE.LOD[] = [];
  private godRays: THREE.Mesh[] = [];
  private waterMesh: THREE.Mesh;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private flickerLights: THREE.PointLight[] = [];

  // Instanced foliage/cargo/dust/debris
  private containerInstances: THREE.InstancedMesh | null = null;
  private dustInstanced: THREE.InstancedMesh;
  private dustOffsets: Float32Array;
  private sparkInstanced: THREE.InstancedMesh;
  private sparks: SparkParticle[] = [];
  private sparkCursor = 0;
  private sparksActive = false;
  private sparksNeedClear = false;
  private debrisInstanced: THREE.InstancedMesh;
  private debris: DebrisParticle[] = [];
  private debrisCursor = 0;
  private debrisActive = false;
  private debrisNeedClear = false;

  // Sky Dome & Distant Horizon Ring
  private skyDome: THREE.Mesh;
  private skyUniforms = {
    uTopColor: { value: new THREE.Color(0x101824) },
    uHorizonColor: { value: new THREE.Color(0x142030) },
    uGlowColor: { value: new THREE.Color(0xffd58a) },
  };
  private harborRing: THREE.Group;

  // Shockwave, Strike Arc, Crane Preview & Grapple visuals
  private shockwaveRing: THREE.Mesh;
  private shockwaveTimer = 0;
  private craneShockDome: THREE.Mesh;
  private craneShockTimer = 0;
  private strikeArcMesh: THREE.Mesh;
  private strikeArcTimer = 0;
  private cranePreviewRing: THREE.Mesh;
  private grappleLine: THREE.Line;
  private grappleTimer = 0;

  // Gameplay state
  private mode: GameModeState = 'title';
  private quality: GraphicsQuality = 'high';
  private difficulty: DifficultyLevel = 'captain';
  private keybindings: Keybindings;
  private rmbJumpTap = true;
  private currentTheme: ArenaTheme = 'port_gravel';

  // Player kinematics
  private playerPos = new THREE.Vector3(0, 0, 12);
  private playerVelY = 0;
  private playerYaw = 0;
  private onGround = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private walkPhase = 0;
  private squashX = 1;
  private squashY = 1;
  private hp = 100;
  private maxHp = 100;
  private energy = 100;
  private maxEnergy = 100;
  private score = 0;
  private objectivesCleared = 0;
  private objectivesTotal = 3;

  // Cooldowns & combat feel
  private craneCooldown = 0;
  private grappleCooldown = 0;
  private slamCooldown = 0;
  private attackCooldown = 0;
  private comboStep = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private dashCooldown = 0;
  private dashTimer = 0;
  private dashInvulnTimer = 0;
  private dashDir = new THREE.Vector2(0, -1);
  private hitstopTimer = 0;
  private trauma = 0;
  private craneDropAnim = 0;
  private rigStability = 50;
  private rigOscPhase = 0;

  // Orbit Camera
  private camYaw = 0;
  private camPitch = 0.42;
  private camDist = 11.5;
  private targetCamDist = 11.5;
  private camLookPos = new THREE.Vector3(0, 1.5, 12);

  // Input state
  private keysDown = new Set<string>();
  private lmbDown = false;
  private lmbDownAt = 0;
  private lmbDragDist = 0;
  private rmbDown = false;
  private rmbDownAt = 0;
  private rmbDragDist = 0;
  private virtualMoveX = 0;
  private virtualMoveZ = 0;

  // Pooled projectile geometry/material & shader uniforms
  private boltGeo: THREE.SphereGeometry;
  private boltMat: THREE.MeshBasicMaterial;
  private boltPool: ProjectileBolt[] = [];
  private waterUniforms = { uTime: { value: 0 } };
  private fovKick = 0;
  private relicBonuses: RelicBonuses = DEFAULT_RELIC_BONUSES;
  private currentChapterId: ChapterId = 'prolog';
  private loreToast: { title: string; text: string } | null = null;
  private loreToastTimer = 0;
  private subQuestHint: string | null = null;
  private subQuestHintTimer = 0;
  private subQuestTriggerCount = 0;
  private interruptCount = 0;
  private arenaObstacles: ArenaObstacle[] = [];
  private obstacleHitCooldown = 0;

  // Entities
  private enemies: EnemyRig[] = [];
  private interactables: InteractableNode[] = [];
  private pickups: ArenaPickup[] = [];
  private nextPickupId = 1;
  private floatingTexts: FloatingWorldText[] = [];
  private nextTextId = 1;
  private nextEnemyId = 1;
  private arenaRadius = 32;
  private obstacles: Array<{ x: number; z: number; rx: number; rz: number }> = [];

  private frameId = 0;
  private destroyed = false;
  private lastHudPush = 0;
  private chapterDoneEmitted = false;
  private defeatEmitted = false;
  private titleOrbitAngle = 0;

  constructor(
    container: HTMLElement,
    initialQuality: GraphicsQuality,
    initialDifficulty: DifficultyLevel,
    initialKeybindings: Keybindings,
    callbacks: SceneCallbacks,
  ) {
    this.container = container;
    this.quality = initialQuality;
    this.difficulty = initialDifficulty;
    this.keybindings = { ...initialKeybindings };
    this.callbacks = callbacks;

    this.isSoftwareGl = this.detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101824);
    this.scene.fog = new THREE.FogExp2(0x142030, 0.013);

    // Mandatory studio environment reflections for high-metalness PBR
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.15, 280);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTexturePack(maxAniso);

    // Three-point / warm-cool contrast lighting
    this.hemiLight = new THREE.HemisphereLight(0x5c80a6, 0x241c15, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffcf87, 2.7);
    this.keyLight.position.set(22, 34, 18);
    const shadowRes = this.isSoftwareGl ? 1024 : 2048;
    this.keyLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 95;
    const d = 32;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // Cool/cyan rim backlight for sharp metallic edge separation on hero exosuit & containers
    this.rimLight = new THREE.DirectionalLight(0x5ea9ff, 1.35);
    this.rimLight.position.set(-20, 14, -22);
    this.scene.add(this.rimLight);

    // Outer ocean plane (extends to fog horizon so arena never floats in void)
    const waterGeo = new THREE.PlaneGeometry(420, 420);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0b2030,
      metalness: 0.58,
      roughness: 0.24,
    });
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWorldPos;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float wave1 = sin(vWorldPos.x * 0.24 + uTime * 1.15) * cos(vWorldPos.z * 0.22 - uTime * 0.85);
           float wave2 = sin((vWorldPos.x + vWorldPos.z) * 0.14 - uTime * 0.7);
           diffuseColor.rgb += vec3(0.015, 0.042, 0.062) * (0.5 + 0.5 * (wave1 * 0.65 + wave2 * 0.35));`,
        );
    };
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = -1.6;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Procedural Horizon Sky Dome + Distant Harbor Archipelago Ring
    const skyGeo = new THREE.SphereGeometry(185, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uGlowColor;
        varying vec3 vDir;
        void main() {
          vec3 base = mix(uHorizonColor, uTopColor, clamp(vDir.y * 1.4, 0.0, 1.0));
          float rim = pow(max(0.0, 1.0 - abs(vDir.y) * 3.5), 3.0);
          gl_FragColor = vec4(base + uGlowColor * rim * 0.28, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this.harborRing = createDistantHarborRing();
    this.scene.add(this.harborRing);

    // Shared pre-allocated projectile pool (zero per-shot allocations)
    this.boltGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.boltPool.push({
        mesh,
        pos: mesh.position,
        vel: new THREE.Vector3(),
        life: 0,
        damage: 9,
        active: false,
      });
    }

    // Core hero, Field Assist Drone, Polina L., Crane, Airships
    this.hero = createHeroModel(this.textures);
    this.scene.add(this.hero.group);

    this.assistDrone = createAssistDrone(this.textures);
    this.assistDrone.group.position.set(-1.5, 1.85, 13);
    this.scene.add(this.assistDrone.group);

    this.polinaShip = createPolinaShipLOD(this.textures);
    this.polinaShip.position.set(-22, -1.0, -14);
    this.polinaShip.rotation.y = 0.35;
    this.scene.add(this.polinaShip);

    this.crane = createGantryCrane(this.textures);
    this.crane.group.position.set(0, 0, -6);
    this.scene.add(this.crane.group);

    for (let i = 0; i < 2; i++) {
      const airship = createAirshipLOD(this.textures);
      airship.position.set(-35 + i * 68, 22 + i * 5, -42 - i * 16);
      airship.rotation.y = i === 0 ? 0.25 : -0.4;
      this.scene.add(airship);
      this.airships.push(airship);
    }

    // Volumetric God Rays cones (soft atmospheric shafts)
    const rayGeo = new THREE.ConeGeometry(11.5, 42, 18, 1, true);
    for (let i = 0; i < 3; i++) {
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0xffd58a,
        transparent: true,
        opacity: 0.036,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(-10 + i * 11, 20, -8 + i * 5);
      ray.rotation.z = -0.22;
      ray.rotation.x = 0.14;
      this.scene.add(ray);
      this.godRays.push(ray);
    }

    // Floating golden dust motes (InstancedMesh)
    const dustCount = 120;
    const dustGeo = new THREE.SphereGeometry(0.055, 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xf7dc94,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
    this.dustInstanced.frustumCulled = false;
    this.dustOffsets = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      this.dustOffsets[i * 3] = (Math.random() - 0.5) * 52;
      this.dustOffsets[i * 3 + 1] = 0.8 + Math.random() * 12;
      this.dustOffsets[i * 3 + 2] = (Math.random() - 0.5) * 52;
    }
    this.scene.add(this.dustInstanced);

    // Pooled sparks (InstancedMesh, zero GC)
    const sparkCount = 96;
    const sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.24);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.sparkInstanced = new THREE.InstancedMesh(sparkGeo, sparkMat, sparkCount);
    this.sparkInstanced.frustumCulled = false;
    for (let i = 0; i < sparkCount; i++) {
      this.sparks.push({
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        scale: 0,
        color: new THREE.Color(0xffc04d),
      });
      _v1.set(0, -100, 0);
      _quat.identity();
      _scale.setScalar(0);
      _mat4.compose(_v1, _quat, _scale);
      this.sparkInstanced.setMatrixAt(i, _mat4);
    }
    this.sparkInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.sparkInstanced);

    // Pooled physical metal debris shards (InstancedMesh, zero GC)
    const debrisCount = 48;
    const debrisGeo = new THREE.BoxGeometry(0.18, 0.08, 0.22);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      metalness: 0.84,
      roughness: 0.34,
    });
    this.debrisInstanced = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
    this.debrisInstanced.frustumCulled = false;
    for (let i = 0; i < debrisCount; i++) {
      this.debris.push({
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
        scale: 0,
      });
      _v1.set(0, -100, 0);
      _quat.identity();
      _scale.setScalar(0);
      _mat4.compose(_v1, _quat, _scale);
      this.debrisInstanced.setMatrixAt(i, _mat4);
    }
    this.debrisInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.debrisInstanced);

    // Shockwave ring (Slam [3])
    const swGeo = new THREE.RingGeometry(0.8, 1.35, 32);
    swGeo.rotateX(-Math.PI / 2);
    const swMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shockwaveRing = new THREE.Mesh(swGeo, swMat);
    this.shockwaveRing.position.y = 0.15;
    this.scene.add(this.shockwaveRing);

    // Crane impact expanding ring
    const cswGeo = new THREE.RingGeometry(0.9, 1.75, 32);
    cswGeo.rotateX(-Math.PI / 2);
    const cswMat = new THREE.MeshBasicMaterial({
      color: 0xf2cb77,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.craneShockDome = new THREE.Mesh(cswGeo, cswMat);
    this.craneShockDome.position.y = 0.16;
    this.scene.add(this.craneShockDome);

    // Iron Gauntlet Melee Strike Arc
    const arcGeo = new THREE.RingGeometry(0.95, 2.55, 18, 1, Math.PI * 0.05, Math.PI * 0.9);
    arcGeo.rotateX(-Math.PI / 2);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xf7dc94,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.strikeArcMesh = new THREE.Mesh(arcGeo, arcMat);
    this.strikeArcMesh.visible = false;
    this.scene.add(this.strikeArcMesh);

    // Crane target preview ring (shows front drop spot 5.2m ahead of Artem)
    const cpGeo = new THREE.RingGeometry(1.35, 1.85, 24);
    cpGeo.rotateX(-Math.PI / 2);
    const cpMat = new THREE.MeshBasicMaterial({
      color: 0xf2cb77,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.cranePreviewRing = new THREE.Mesh(cpGeo, cpMat);
    this.cranePreviewRing.position.y = 0.06;
    this.cranePreviewRing.visible = false;
    this.scene.add(this.cranePreviewRing);

    // Grapple line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 1, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf2cb77 });
    this.grappleLine = new THREE.Line(lineGeo, lineMat);
    this.grappleLine.visible = false;
    this.scene.add(this.grappleLine);

    this.scene.add(this.arenaGroup);
    this.setupComposer(w, h);
    this.applyGraphicsQuality(this.quality);
    this.loadArena('port_gravel', 3, 2);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Render initial Title Screen frame immediately so first paint is never black
    this.update(0.016, 0.25);
    this.renderer.render(this.scene, this.camera);

    this.attachEvents();
    this.startLoop();
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private setupComposer(w: number, h: number): void {
    if (this.isSoftwareGl) {
      this.composer = null;
      return;
    }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
      0.42,
      0.45,
      0.85,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  public setMode(mode: GameModeState): void {
    this.mode = mode;
    if (mode !== 'playing') {
      this.keysDown.clear();
      this.lmbDown = false;
      this.rmbDown = false;
      this.virtualMoveX = 0;
      this.virtualMoveZ = 0;
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public setDifficulty(diff: DifficultyLevel): void {
    this.difficulty = diff;
  }

  public setKeybindings(kb: Keybindings, rmbJumpTap: boolean): void {
    this.keybindings = { ...kb };
    this.rmbJumpTap = rmbJumpTap;
  }

  public applyGraphicsQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    const dprCap = this.isSoftwareGl
      ? 1
      : quality === 'low'
        ? 1
        : quality === 'balanced'
          ? 1.25
          : quality === 'high'
            ? 1.5
            : 2.0;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

    const enableShadows = !this.isSoftwareGl && (quality === 'high' || quality === 'cinematic');
    this.renderer.shadowMap.enabled = enableShadows;
    this.keyLight.castShadow = enableShadows;

    const showRays = quality === 'high' || quality === 'cinematic';
    for (const ray of this.godRays) {
      ray.visible = showRays;
    }
    this.dustInstanced.visible = quality !== 'low';

    if (this.bloomPass) {
      this.bloomPass.enabled = quality === 'cinematic' || quality === 'high';
      this.bloomPass.strength = quality === 'cinematic' ? 0.52 : 0.32;
    }
  }

  private clearArenaGroup(): void {
    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();
    this.arenaGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !disposedGeos.has(mesh.geometry)) {
        mesh.geometry.dispose();
        disposedGeos.add(mesh.geometry);
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!disposedMats.has(m)) {
            m.dispose();
            disposedMats.add(m);
          }
        }
      }
    });
    while (this.arenaGroup.children.length > 0) {
      this.arenaGroup.remove(this.arenaGroup.children[0]);
    }
  }

  public loadArena(
    theme: ArenaTheme,
    objectiveCount: number,
    enemyWaves: number,
    bonuses: RelicBonuses = DEFAULT_RELIC_BONUSES,
    blueprint?: ChapterBlueprint,
    chapterId: ChapterId = 'prolog',
    unlockedLore: ChapterId[] = [],
  ): void {
    this.currentTheme = theme;
    this.currentChapterId = chapterId;
    this.relicBonuses = bonuses;
    this.loreToast = null;
    this.loreToastTimer = 0;
    this.subQuestHint = null;
    this.subQuestHintTimer = 0;
    this.subQuestTriggerCount = 0;
    this.interruptCount = 0;
    const pal = THEME_PALETTES[theme];

    (this.scene.background as THREE.Color).setHex(pal.bg);
    this.skyUniforms.uTopColor.value.setHex(pal.bg);
    this.skyUniforms.uHorizonColor.value.setHex(pal.fogColor);
    this.skyUniforms.uGlowColor.value.setHex(pal.godRayColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(pal.fogColor);
      this.scene.fog.density = pal.fogDensity;
    }
    this.keyLight.color.setHex(pal.keyColor);
    this.keyLight.intensity = pal.keyIntensity;
    this.rimLight.color.setHex(theme === 'abyssal_archive' ? 0x34d399 : 0x5ea9ff);
    this.rimLight.intensity = theme === 'zero_mooring' ? 1.55 : 1.3;
    this.hemiLight.color.setHex(pal.hemiSky);
    this.hemiLight.groundColor.setHex(pal.hemiGround);
    this.hemiLight.intensity = pal.hemiIntensity;
    (this.waterMesh.material as THREE.MeshStandardMaterial).color.setHex(pal.waterColor);
    for (const ray of this.godRays) {
      (ray.material as THREE.MeshBasicMaterial).color.setHex(pal.godRayColor);
    }

    // Clear & dispose previous dynamic arena props cleanly
    this.clearArenaGroup();
    this.flickerLights = [];
    this.enemies.forEach((e) => {
      this.scene.remove(e.group);
      disposeObjectTree(e.group);
    });
    this.enemies = [];
    for (const b of this.boltPool) {
      b.active = false;
      b.mesh.visible = false;
    }
    this.interactables.forEach((n) => {
      this.scene.remove(n.group);
      disposeObjectTree(n.group);
    });
    this.interactables = [];
    this.arenaObstacles.forEach((o) => {
      this.scene.remove(o.group);
      disposeObjectTree(o.group);
    });
    this.arenaObstacles = [];
    this.pickups.forEach((p) => {
      this.scene.remove(p.group);
      disposeObjectTree(p.group);
    });
    this.pickups = [];
    this.obstacles = [];
    this.obstacleHitCooldown = 0;

    // Main pier / platform deck (elevated above ocean, open horizon)
    const deckGeo = new THREE.BoxGeometry(58, 1.8, 58);
    const deckMat = new THREE.MeshStandardMaterial({
      map: this.textures.deckAlbedo,
      roughnessMap: this.textures.deckRoughness,
      normalMap: this.textures.deckNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.78,
      metalness: 0.35,
      color: 0xffffff,
    });
    const mainDeck = new THREE.Mesh(deckGeo, deckMat);
    mainDeck.position.y = -0.9;
    mainDeck.receiveShadow = true;
    this.arenaGroup.add(mainDeck);

    // Outer lower pier catwalks
    const walkwayMat = new THREE.MeshStandardMaterial({
      map: this.textures.rustMetalAlbedo,
      roughnessMap: this.textures.rustMetalRoughness,
      normalMap: this.textures.rustNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.7,
      metalness: 0.58,
      color: 0xffffff,
    });
    for (const sx of [-31, 31]) {
      const cat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 46), walkwayMat);
      cat.position.set(sx, -0.55, 0);
      cat.receiveShadow = true;
      this.arenaGroup.add(cat);
    }

    // Instanced Cargo Containers (20 containers around perimeter + tactical lanes)
    const contGeo = new THREE.BoxGeometry(4.4, 2.5, 2.2);
    const contMat = new THREE.MeshStandardMaterial({
      map: this.textures.rustMetalAlbedo,
      roughnessMap: this.textures.rustMetalRoughness,
      normalMap: this.textures.rustNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.62,
      metalness: 0.55,
    });
    const contPositions = [
      [-18, -18, 0.1], [-18, -15.3, -0.05], [17, -18, -0.1], [19, -12, 1.5],
      [-20, 6, 1.55], [20, 8, 1.58], [-12, -21, 0.0], [11, -21, 0.08],
      [-14, 18, 0.2], [14, 17, -0.15], [-8, -10, 0.15], [9, -11, -0.2],
      [-23, -4, 1.57], [23, -2, 1.57], [0, -23, 0], [-23, 15, 0.4],
      [22, 16, -0.35], [-5, 22, 0.05], [7, 22, -0.08], [-18, -18, 0.1],
    ];
    this.containerInstances = new THREE.InstancedMesh(contGeo, contMat, contPositions.length);
    this.containerInstances.castShadow = true;
    this.containerInstances.receiveShadow = true;
    const paletteHex = [0x6e3528, 0x2c4863, 0x735b2a, 0x2f5446, 0x4b4f58];

    contPositions.forEach(([x, z, rot], idx) => {
      const isUpper = idx === contPositions.length - 1;
      const y = isUpper ? 3.75 : 1.25;
      _v1.set(x, y, z);
      _quat.setFromAxisAngle(_upAxis, rot);
      const s = 0.94 + (idx % 3) * 0.04;
      _scale.set(s, s, s);
      _mat4.compose(_v1, _quat, _scale);
      this.containerInstances!.setMatrixAt(idx, _mat4);
      _color.setHex(paletteHex[idx % paletteHex.length]);
      this.containerInstances!.setColorAt(idx, _color);

      if (!isUpper && Math.abs(x) < 25 && Math.abs(z) < 25) {
        const hw = Math.abs(Math.cos(rot)) * 2.2 + Math.abs(Math.sin(rot)) * 1.1;
        const hd = Math.abs(Math.sin(rot)) * 2.2 + Math.abs(Math.cos(rot)) * 1.1;
        this.obstacles.push({ x, z, rx: hw + 0.45, rz: hd + 0.45 });
      }
    });
    this.containerInstances.instanceMatrix.needsUpdate = true;
    if (this.containerInstances.instanceColor) this.containerInstances.instanceColor.needsUpdate = true;
    this.containerInstances.computeBoundingSphere();
    this.arenaGroup.add(this.containerInstances);

    // Harbor Mooring Bollards + Instanced Lantern Posts (4 corners, 2 draw calls instead of 8)
    const postGeo = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x242b35, metalness: 0.8, roughness: 0.4 });
    const bulbGeo = new THREE.SphereGeometry(0.28, 10, 10);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: pal.keyColor,
      emissive: pal.keyColor,
      emissiveIntensity: 2.5,
    });
    const lanternSpots: Array<[number, number]> = [
      [-15, -14],
      [15, -14],
      [-15, 14],
      [15, 14],
    ];
    const postInst = new THREE.InstancedMesh(postGeo, postMat, lanternSpots.length);
    const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lanternSpots.length);
    _quat.identity();
    _scale.set(1, 1, 1);
    lanternSpots.forEach(([lx, lz], idx) => {
      _v1.set(lx, 2.1, lz);
      _mat4.compose(_v1, _quat, _scale);
      postInst.setMatrixAt(idx, _mat4);
      _v1.set(lx, 4.3, lz);
      _mat4.compose(_v1, _quat, _scale);
      bulbInst.setMatrixAt(idx, _mat4);

      const pt = new THREE.PointLight(pal.keyColor, 6.5, 22, 1.6);
      pt.position.set(lx, 4.2, lz);
      this.arenaGroup.add(pt);
      this.flickerLights.push(pt);
    });
    postInst.instanceMatrix.needsUpdate = true;
    bulbInst.instanceMatrix.needsUpdate = true;
    this.arenaGroup.add(postInst, bulbInst);

    // Instanced Steel Mooring Bollards around dock perimeter (1 single draw call for 12 cleats)
    const bollardGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.88, 10);
    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0x3b4452,
      metalness: 0.85,
      roughness: 0.38,
      normalMap: this.textures.rustNormal,
    });
    const bollardCoords: Array<[number, number]> = [
      [-26, -24], [-13, -26], [13, -26], [26, -24],
      [-26, 24], [-13, 26], [13, 26], [26, 24],
      [-27, -8], [-27, 8], [27, -8], [27, 8],
    ];
    const bollardInst = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCoords.length);
    bollardInst.castShadow = true;
    bollardInst.receiveShadow = true;
    bollardCoords.forEach(([bx, bz], idx) => {
      _v1.set(bx, 0.44, bz);
      _quat.identity();
      _scale.setScalar(1);
      _mat4.compose(_v1, _quat, _scale);
      bollardInst.setMatrixAt(idx, _mat4);
    });
    bollardInst.instanceMatrix.needsUpdate = true;
    this.arenaGroup.add(bollardInst);

    // Instanced Yellow-Black Hazard Stanchions framing the dock walkway (1 draw call for 16 posts)
    const stanchionGeo = new THREE.BoxGeometry(0.24, 1.05, 0.24);
    const stanchionMat = new THREE.MeshStandardMaterial({
      map: this.textures.hazardAlbedo,
      roughness: 0.48,
      metalness: 0.6,
    });
    const stanchionCoords: Array<[number, number]> = [
      [-28.2, -20], [-28.2, -12], [-28.2, -4], [-28.2, 4], [-28.2, 12], [-28.2, 20],
      [28.2, -20], [28.2, -12], [28.2, -4], [28.2, 4], [28.2, 12], [28.2, 20],
      [-18, 27.5], [-6, 27.5], [6, 27.5], [18, 27.5],
    ];
    const stanchionInst = new THREE.InstancedMesh(stanchionGeo, stanchionMat, stanchionCoords.length);
    stanchionInst.castShadow = true;
    stanchionInst.receiveShadow = true;
    stanchionCoords.forEach(([sx, sz], idx) => {
      _v1.set(sx, 0.52, sz);
      _quat.identity();
      _scale.setScalar(1);
      _mat4.compose(_v1, _quat, _scale);
      stanchionInst.setMatrixAt(idx, _mat4);
    });
    stanchionInst.instanceMatrix.needsUpdate = true;
    this.arenaGroup.add(stanchionInst);

    // Position Polina L. visible on the left harbor berth & calibrate crane reticle to relic radius
    this.polinaShip.visible = theme !== 'abyssal_archive';
    this.crane.group.position.set(0, 0, -4);
    const reticleScale = (6.2 + bonuses.craneRadiusBonus) / 6.2;
    this.crane.dropReticle.scale.setScalar(reticleScale);

    // Reset player in open clear path facing the crane & objective vista
    this.maxHp = 100 + bonuses.maxHpBonus;
    this.hp = this.maxHp;
    this.energy = this.maxEnergy;
    this.playerPos.set(0, 0, 13);
    this.playerVelY = 0;
    this.playerYaw = 0;
    this.camYaw = 0;
    this.camLookPos.set(0, 1.55, 13);
    this.onGround = true;
    this.objectivesCleared = 0;
    this.objectivesTotal = objectiveCount;
    this.chapterDoneEmitted = false;
    this.defeatEmitted = false;
    this.craneCooldown = 0;
    this.grappleCooldown = 0;
    this.slamCooldown = 0;
    this.attackCooldown = 0;
    this.comboStep = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashInvulnTimer = 0;

    // Spawn Blueprint Physics/Timing Obstacles (steam vents, swinging beams, moving presses, laser cordons)
    if (blueprint && blueprint.obstacleCount > 0) {
      const obstacleSpots: Array<[number, number, 'x' | 'z']> = [
        [-5, 4, 'x'],
        [5, -3, 'z'],
        [0, -9, 'x'],
        [-11, -6, 'z'],
      ];
      for (let i = 0; i < blueprint.obstacleCount; i++) {
        const [ox, oz, axis] = obstacleSpots[i % obstacleSpots.length];
        const ob = createArenaObstacle(
          blueprint.obstacleKind,
          new THREE.Vector3(ox, 0, oz),
          axis,
          i * 1.7,
          blueprint.obstacleSpeed,
          this.textures,
        );
        this.scene.add(ob.group);
        this.arenaObstacles.push(ob);
      }
    }

    // Spawn Interactable Objectives (Cargo Crates / Dispatch Levers)
    const objSpots = [
      new THREE.Vector3(-10, 0, 2),
      new THREE.Vector3(10, 0, 1),
      new THREE.Vector3(0, 0, -14),
      new THREE.Vector3(-12, 0, -11),
    ];
    for (let i = 0; i < objectiveCount; i++) {
      const node = createInteractableNode(
        `obj_${i}`,
        `Contract Crate #${i + 1}`,
        objSpots[i % objSpots.length],
        pal.nodeAccent,
        this.isSoftwareGl,
        false,
      );
      this.scene.add(node.group);
      this.interactables.push(node);
    }

    // Spawn Relic-Unlocked Bypass Shortcut Relay if player owns the sector's bypass relic
    if (blueprint?.bypassRelicId && bonuses.ownedRelics.includes(blueprint.bypassRelicId)) {
      const bypassNode = createInteractableNode(
        'bypass_shortcut',
        'Relic Bypass Relay',
        new THREE.Vector3(-13.5, 0, 7.5),
        0xf2cb77,
        this.isSoftwareGl,
        true,
      );
      this.scene.add(bypassNode.group);
      this.interactables.push(bypassNode);
    }

    // Spawn Sector Black-Box Lore Beacon on right dock flank if not yet decoded
    if (!unlockedLore.includes(chapterId)) {
      const loreEntry = SECTOR_LORE_CODEX[chapterId];
      const loreNode = createLoreBeaconNode(
        `lore_${chapterId}`,
        loreEntry ? loreEntry.code : 'BLACK BOX LOG',
        new THREE.Vector3(13.5, 0, 7.5),
        this.isSoftwareGl,
      );
      this.scene.add(loreNode.group);
      this.interactables.push(loreNode);
    }

    // Spawn Enemy Squad across 3 distinct archetypes
    const archetypes: Array<'enforcer' | 'skimmer' | 'warden'> = ['enforcer', 'skimmer', 'warden'];
    const totalEnemies = Math.max(3, enemyWaves * 2 + 1);
    const enemySpots = [
      [-6, -5], [6, -5], [0, -11], [-12, -3], [12, -4], [-4, -15], [7, -14],
    ];
    for (let i = 0; i < totalEnemies; i++) {
      const arch = archetypes[i % archetypes.length];
      const baseHp = arch === 'warden' ? 140 : arch === 'enforcer' ? 105 : 75;
      const diffHp =
        this.difficulty === 'story' ? Math.round(baseHp * 0.75) : this.difficulty === 'hardcore' ? Math.round(baseHp * 1.25) : baseHp;
      const enemy = createEnemyModel(this.nextEnemyId++, arch, this.textures, diffHp);
      const [ex, ez] = enemySpots[i % enemySpots.length];
      enemy.group.position.set(ex + (i > 6 ? 2 : 0), 0, ez);
      enemy.homePos.copy(enemy.group.position);
      this.scene.add(enemy.group);
      this.enemies.push(enemy);
    }

    if (this.mode === 'playing') {
      this.updateCamera(1);
    }
    this.pushHud(true);
  }

  public triggerAttack(): void {
    if (this.mode !== 'playing' || this.attackCooldown > 0) return;
    this.attackCooldown = 0.34;
    this.comboStep = (this.comboStep % 3) + 1;
    const isFinisher = this.comboStep === 3;

    this.strikeArcTimer = 0.18;
    this.strikeArcMesh.position.set(this.playerPos.x, 1.05, this.playerPos.z);
    this.strikeArcMesh.rotation.y = this.playerYaw;
    this.strikeArcMesh.scale.setScalar(isFinisher ? 1.24 : 1.0);
    (this.strikeArcMesh.material as THREE.MeshBasicMaterial).color.setHex(isFinisher ? 0xf2cb77 : 0x38bdf8);
    this.strikeArcMesh.visible = true;

    this.squashX = isFinisher ? 1.22 : 1.14;
    this.squashY = isFinisher ? 0.84 : 0.92;
    this.hero.rightArm.rotation.x = -1.45;
    this.hero.leftArm.rotation.x = isFinisher ? -1.25 : 0.45;

    const fx = -Math.sin(this.playerYaw);
    const fz = -Math.cos(this.playerYaw);
    const reach = isFinisher ? 3.55 : 3.2;
    const baseDmg = computeCombatDamage(isFinisher ? 44 : 28, this.difficulty, true, false);
    let hitAny = false;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.group.position.x - this.playerPos.x;
      const dz = enemy.group.position.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= reach) {
        const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
        if (dot > 0.15 || dist < 1.35) {
          hitAny = true;
          if (enemy.windupActive) {
            enemy.windupActive = false;
            (enemy.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
            this.score += 100;
            this.interruptCount++;
            this.addFloatingText(enemy.group.position, 'INTERRUPTED!', '#38bdf8');
            if (this.interruptCount === 2) {
              this.triggerSubQuestBonus('COUNTER-INTERRUPT');
            }
          }
          const kb = isFinisher ? 1.85 : 0.75;
          if (dist > 0.01) {
            enemy.group.position.x = THREE.MathUtils.clamp(enemy.group.position.x + (dx / dist) * kb, -25, 25);
            enemy.group.position.z = THREE.MathUtils.clamp(enemy.group.position.z + (dz / dist) * kb, -25, 25);
          }
          this.comboCount++;
          this.comboTimer = 4.2;
          this.energy = Math.min(this.maxEnergy, this.energy + 10);
          this.damageEnemy(enemy, baseDmg, isFinisher ? '#f2cb77' : '#ede7da', isFinisher);
        }
      }
    }

    soundEngine.playGauntletSwing(this.comboStep, hitAny);
    if (hitAny) {
      this.trauma = Math.min(1, this.trauma + (isFinisher ? 0.34 : 0.16));
      this.fovKick = Math.max(this.fovKick, isFinisher ? 2.2 : 1.1);
      this.spawnSparks(
        this.playerPos.x + fx * 1.6,
        1.1,
        this.playerPos.z + fz * 1.6,
        isFinisher ? 16 : 8,
        isFinisher ? 0xf2cb77 : 0x38bdf8,
      );
    }
    this.pushHud(true);
  }

  public triggerDash(): void {
    if (this.mode !== 'playing' || this.dashCooldown > 0 || this.energy < 30) return;
    let fwd = 0;
    let right = 0;
    if (this.keysDown.has(this.keybindings.moveForward)) fwd += 1;
    if (this.keysDown.has(this.keybindings.moveBackward)) fwd -= 1;
    if (this.keysDown.has(this.keybindings.strafeRight)) right += 1;
    if (this.keysDown.has(this.keybindings.strafeLeft)) right -= 1;
    if (Math.abs(this.virtualMoveZ) > 0.1) fwd -= this.virtualMoveZ;
    if (Math.abs(this.virtualMoveX) > 0.1) right += this.virtualMoveX;

    const moveVec = computeCameraMovementVector(this.camYaw, fwd, right);
    const dv = computeDashVector(moveVec.x, moveVec.z, this.playerYaw);

    this.energy = Math.max(0, this.energy - 30);
    this.dashTimer = 0.18;
    this.dashCooldown = 1.1;
    this.dashInvulnTimer = 0.28;
    this.dashDir.set(dv.x, dv.z);
    this.playerYaw = Math.atan2(-dv.x, -dv.z);
    this.squashX = 0.8;
    this.squashY = 1.18;
    this.fovKick = Math.max(this.fovKick, 2.5);
    this.trauma = Math.min(1, this.trauma + 0.16);
    soundEngine.playDash();
    this.spawnSparks(this.playerPos.x, 0.9, this.playerPos.z, 14, 0x38bdf8);
    this.pushHud(true);
  }

  public triggerCraneMoment(): void {
    if (this.mode !== 'playing' || this.craneCooldown > 0) return;
    this.craneCooldown = Number((4.5 * this.relicBonuses.craneCooldownMult).toFixed(2));
    this.craneDropAnim = 1.0;

    // Target 5.2m in front of Artem
    const tx = this.playerPos.x - Math.sin(this.playerYaw) * 5.2;
    const tz = this.playerPos.z - Math.cos(this.playerYaw) * 5.2;
    this.crane.trolley.position.x = THREE.MathUtils.clamp(tx, -5, 5);
    this.crane.beamGroup.position.x = this.crane.trolley.position.x;

    this.craneShockTimer = 0.42;
    this.craneShockDome.position.set(tx, 0.16, tz);
    this.craneShockDome.scale.setScalar(1);

    const rawDmg = computeCombatDamage(72, this.difficulty, true, true);
    const rigEval = evaluateCraneBalanceDrop(this.rigStability);
    const scaledDmg = Math.round(rawDmg * this.relicBonuses.craneDamageMult * rigEval.bonusMult);
    const oc = computeOverchargeBonus(scaledDmg, this.energy);
    if (rigEval.stable) {
      this.callbacks.onInteractBonusAK(5000);
      this.addFloatingText(this.playerPos, 'RIG LOCKED 1.35x · +5,000 AK', '#a3e635');
    } else {
      this.addFloatingText(this.playerPos, 'COUNTERWEIGHT SLIP', '#ff6b1a');
    }
    if (oc.overcharged) {
      this.energy = Math.max(0, this.energy - oc.energyCost);
      this.addFloatingText(this.playerPos, 'OVERCHARGE!', '#a3e635');
    }

    soundEngine.playCraneImpact();
    this.trauma = Math.min(1, this.trauma + (oc.overcharged ? 0.9 : 0.76));
    this.fovKick = Math.max(this.fovKick, oc.overcharged ? 4.2 : 3.2);
    this.hitstopTimer = oc.overcharged ? 0.075 : 0.055;
    this.spawnSparks(tx, 0.6, tz, oc.overcharged ? 32 : 24, oc.overcharged ? 0xa3e635 : 0xff6b1a);
    this.spawnDebris(tx, 0.5, tz, 14);

    const impactRadius = 6.2 + this.relicBonuses.craneRadiusBonus;
    let hits = 0;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dist = Math.hypot(enemy.group.position.x - tx, enemy.group.position.z - tz);
      if (dist <= impactRadius) {
        this.comboCount++;
        this.comboTimer = 4.2;
        this.damageEnemy(enemy, oc.damage, oc.overcharged ? '#a3e635' : '#ff8c38', true);
        hits++;
      }
    }
    if (hits > 0) {
      this.score += Math.round(hits * 150 * computeComboMultiplier(this.comboCount));
      if (hits >= 2 && this.subQuestTriggerCount === 0) {
        this.triggerSubQuestBonus('CRANE MULTI-HIT');
      }
    }
    this.pushHud(true);
  }

  public triggerGrapple(): void {
    if (this.mode !== 'playing' || this.grappleCooldown > 0) return;
    this.grappleCooldown = Number((2.4 * this.relicBonuses.grappleCooldownMult).toFixed(2));
    soundEngine.playGrapple();
    this.trauma = Math.min(1, this.trauma + 0.2);
    this.fovKick = Math.max(this.fovKick, 2.0);

    let best: EnemyRig | null = null;
    let bestDist = 14.0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.group.position.distanceTo(this.playerPos);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    if (best) {
      this.grappleTimer = 0.28;
      const posAttr = this.grappleLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.setXYZ(0, this.playerPos.x, 1.3, this.playerPos.z);
      posAttr.setXYZ(1, best.group.position.x, 1.2, best.group.position.z);
      posAttr.needsUpdate = true;
      this.grappleLine.visible = true;

      // Yank target closer
      _v1.subVectors(this.playerPos, best.group.position).setY(0).normalize();
      best.group.position.addScaledVector(_v1, Math.min(3.5, Math.max(0, bestDist - 2.2)));
      best.windupActive = false;
      (best.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;

      this.comboCount++;
      this.comboTimer = 4.2;
      const dmg = computeCombatDamage(52, this.difficulty, true, false);
      this.damageEnemy(best, dmg, '#38bdf8', false);
      this.spawnSparks(best.group.position.x, 1.2, best.group.position.z, 12, 0x38bdf8);
    }
    this.pushHud(true);
  }

  public triggerSlam(): void {
    if (this.mode !== 'playing' || this.slamCooldown > 0) return;
    this.slamCooldown = Number((3.2 * this.relicBonuses.slamCooldownMult).toFixed(2));
    this.shockwaveTimer = 0.45;
    this.shockwaveRing.position.set(this.playerPos.x, 0.14, this.playerPos.z);
    this.shockwaveRing.scale.setScalar(1);

    const baseDmg = computeCombatDamage(58, this.difficulty, true, false);
    const oc = computeOverchargeBonus(baseDmg, this.energy);
    if (oc.overcharged) {
      this.energy = Math.max(0, this.energy - oc.energyCost);
      this.addFloatingText(this.playerPos, 'OVERCHARGE!', '#38bdf8');
    }

    soundEngine.playSlam();
    this.trauma = Math.min(1, this.trauma + (oc.overcharged ? 0.6 : 0.48));
    this.fovKick = Math.max(this.fovKick, 2.8);
    this.spawnSparks(this.playerPos.x, 0.4, this.playerPos.z, oc.overcharged ? 26 : 18, 0x38bdf8);
    this.spawnDebris(this.playerPos.x, 0.35, this.playerPos.z, 10);

    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.group.position.distanceTo(this.playerPos);
      if (d <= (oc.overcharged ? 6.4 : 5.5)) {
        _v1.subVectors(e.group.position, this.playerPos).setY(0).normalize();
        e.group.position.addScaledVector(_v1, 2.4);
        this.comboCount++;
        this.comboTimer = 4.2;
        this.damageEnemy(e, oc.damage, '#60efff', oc.overcharged);
      }
    }
    this.pushHud(true);
  }

  public triggerJump(): void {
    if (this.mode !== 'playing') return;
    this.jumpBufferTimer = 0.12;
  }

  public triggerInteract(): void {
    if (this.mode !== 'playing') return;
    const range = 3.6 + this.relicBonuses.interactRangeBonus;
    for (const node of this.interactables) {
      if (node.completed) continue;
      if (node.position.distanceTo(this.playerPos) <= range) {
        node.completed = true;
        node.leverProgress = 1;
        const mat = node.coreOrb.material as THREE.MeshPhysicalMaterial;
        mat.color.setHex(0x34d399);
        mat.emissive.setHex(0x34d399);
        (node.groundRing.material as THREE.MeshBasicMaterial).color.setHex(0x34d399);
        (node.beaconSpire.material as THREE.MeshBasicMaterial).opacity = 0.04;

        soundEngine.playRelaySwitch();
        soundEngine.playInteractChime();
        this.trauma = Math.min(1, this.trauma + 0.24);

        if (node.isLore) {
          const loreEntry = SECTOR_LORE_CODEX[this.currentChapterId];
          this.score += 450;
          this.hp = Math.min(this.maxHp, this.hp + 15);
          this.energy = Math.min(this.maxEnergy, this.energy + 40);
          this.shockwaveTimer = 0.45;
          this.shockwaveRing.position.set(node.position.x, 0.14, node.position.z);
          this.shockwaveRing.scale.setScalar(1);
          this.spawnSparks(node.position.x, 1.4, node.position.z, 22, 0xa78bfa);
          this.callbacks.onInteractBonusAK(10000);
          if (loreEntry) {
            this.loreToast = {
              title: `${loreEntry.code} · ${loreEntry.titleEn}`,
              text: loreEntry.bodyEn,
            };
            this.loreToastTimer = 5.2;
            this.callbacks.onLoreUnlocked?.(this.currentChapterId, loreEntry.crewMember);
          }
          this.addFloatingText(node.position, 'BLACK BOX +10,000 AK', '#a78bfa');
          this.pushHud(true);
          return;
        }

        const rigBonus = evaluateCraneBalanceDrop(this.rigStability);
        const stepGain = node.isBypass ? 2 : 1;
        this.objectivesCleared = Math.min(this.objectivesTotal, this.objectivesCleared + stepGain);
        this.score += node.isBypass ? 550 : rigBonus.stable ? 400 : 300;
        this.hp = Math.min(this.maxHp, this.hp + (node.isBypass ? 25 : 15));

        this.spawnSparks(node.position.x, 1.4, node.position.z, 20, node.isBypass ? 0xff6b1a : 0xa3e635);

        const rawAk = (node.isBypass ? 25000 : 15000) + (rigBonus.stable ? 5000 : 0);
        const akGain = Math.round(rawAk * this.relicBonuses.bonusAkMult);
        this.addFloatingText(
          node.position,
          node.isBypass
            ? `BYPASS +${akGain.toLocaleString()} AK`
            : rigBonus.stable
              ? `RIG LOCKED +${akGain.toLocaleString()} AK`
              : `+${akGain.toLocaleString()} AK`,
          node.isBypass ? '#ff8c38' : '#a3e635',
        );
        this.callbacks.onInteractBonusAK(akGain);
        this.checkObjectiveCompletion();
        this.pushHud(true);
        return;
      }
    }
  }

  public setVirtualMove(x: number, z: number): void {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveZ = THREE.MathUtils.clamp(z, -1, 1);
  }

  public orbitBy(deltaYaw: number, deltaPitch: number): void {
    this.camYaw -= deltaYaw;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + deltaPitch, 0.12, 1.25);
  }

  private damageEnemy(enemy: EnemyRig, dmg: number, color: string, isHeavy: boolean): void {
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hitFlashTimer = 0.08;
    for (const m of enemy.baseMaterialList) {
      m.emissive.setHex(0xffffff);
    }
    this.addFloatingText(enemy.group.position, `-${dmg}`, color);

    if (isHeavy) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
    }

    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      enemy.koTimer = 0.42;
      enemy.windupActive = false;
      (enemy.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
      this.score += Math.round(200 * computeComboMultiplier(this.comboCount));
      this.spawnSparks(enemy.group.position.x, 1.1, enemy.group.position.z, 20, 0xf2cb77);
      this.spawnDebris(enemy.group.position.x, 0.9, enemy.group.position.z, 8);
      if (enemy.archetype === 'warden' || Math.random() < 0.55) {
        const kind = this.hp < this.maxHp * 0.72 ? 'hp' : 'energy';
        const pickup = createArenaPickup(this.nextPickupId++, kind, enemy.group.position);
        this.scene.add(pickup.group);
        this.pickups.push(pickup);
      }
      this.checkObjectiveCompletion();
    }
  }

  private triggerSubQuestBonus(label: string): void {
    const prevTotal = computeSubQuestBonus(this.subQuestTriggerCount);
    this.subQuestTriggerCount++;
    const nextTotal = computeSubQuestBonus(this.subQuestTriggerCount);
    const delta = Math.max(0, nextTotal - prevTotal);
    if (delta > 0) {
      this.callbacks.onInteractBonusAK(delta);
      this.score += 350;
      this.subQuestHint = `${label} · +${delta.toLocaleString()} AK`;
      this.subQuestHintTimer = 3.6;
      this.addFloatingText(this.playerPos, `${label} +${delta.toLocaleString()} AK`, '#f2cb77');
    }
  }

  private checkObjectiveCompletion(): void {
    if (this.chapterDoneEmitted) return;
    let alive = 0;
    for (const e of this.enemies) {
      if (!e.dead) alive++;
    }
    if (this.objectivesCleared >= this.objectivesTotal && alive === 0) {
      this.chapterDoneEmitted = true;
      soundEngine.playInteractChime();
      window.setTimeout(() => {
        if (!this.destroyed) {
          this.callbacks.onChapterObjectivesCleared();
        }
      }, 450);
    }
  }

  private addFloatingText(worldPos: THREE.Vector3, text: string, color: string): void {
    let nearbyRecent = 0;
    for (const existing of this.floatingTexts) {
      if (existing.life > 0.68 && Math.hypot(existing.worldPos.x - worldPos.x, existing.worldPos.z - worldPos.z) < 2.2) {
        nearbyRecent++;
      }
    }
    _ftOffset.set((Math.random() - 0.5) * 0.45, 2.0 + nearbyRecent * 0.72, 0);
    this.floatingTexts.push({
      id: this.nextTextId++,
      worldPos: worldPos.clone().add(_ftOffset),
      text,
      color,
      life: 0.95,
    });
    if (this.floatingTexts.length > 10) {
      this.floatingTexts.shift();
    }
  }

  private spawnSparks(x: number, y: number, z: number, count: number, hex: number): void {
    this.sparksActive = true;
    for (let i = 0; i < count; i++) {
      const p = this.sparks[this.sparkCursor % this.sparks.length];
      this.sparkCursor++;
      p.pos.set(x, y, z);
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 6.5;
      p.vel.set(Math.cos(ang) * spd, 2.5 + Math.random() * 5.0, Math.sin(ang) * spd);
      p.life = 0.45 + Math.random() * 0.25;
      p.maxLife = p.life;
      p.scale = 0.8 + Math.random() * 0.7;
      p.color.setHex(hex);
    }
  }

  private spawnDebris(x: number, y: number, z: number, count: number): void {
    this.debrisActive = true;
    for (let i = 0; i < count; i++) {
      const d = this.debris[this.debrisCursor % this.debris.length];
      this.debrisCursor++;
      d.pos.set(x + (Math.random() - 0.5) * 1.1, y, z + (Math.random() - 0.5) * 1.1);
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * 4.8;
      d.vel.set(Math.cos(ang) * spd, 3.2 + Math.random() * 4.2, Math.sin(ang) * spd);
      d.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      d.rotVel.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      d.life = 0.95 + Math.random() * 0.45;
      d.maxLife = d.life;
      d.scale = 0.75 + Math.random() * 0.65;
    }
  }

  private attachEvents(): void {
    const dom = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.mode !== 'playing') return;
      if (e.code === this.keybindings.pause || e.code === 'KeyP') {
        e.preventDefault();
        this.callbacks.onPauseRequested();
        return;
      }
      if (!this.keysDown.has(e.code)) {
        if (e.code === this.keybindings.jump) this.triggerJump();
        else if (e.code === this.keybindings.attack) this.triggerAttack();
        else if (e.code === this.keybindings.dash) this.triggerDash();
        else if (e.code === this.keybindings.skillCrane) this.triggerCraneMoment();
        else if (e.code === this.keybindings.skillGrapple) this.triggerGrapple();
        else if (e.code === this.keybindings.skillSlam) this.triggerSlam();
        else if (e.code === this.keybindings.interact) this.triggerInteract();
      }
      this.keysDown.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
      if (e.code === this.keybindings.jump && this.playerVelY > 0) {
        this.playerVelY *= 0.48; // variable jump cut
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (this.mode !== 'playing') return;
      soundEngine.unlock();
      if (e.button === 0) {
        this.lmbDown = true;
        this.lmbDownAt = performance.now();
        this.lmbDragDist = 0;
        dom.requestPointerLock?.();
      } else if (e.button === 2) {
        this.rmbDown = true;
        this.rmbDownAt = performance.now();
        this.rmbDragDist = 0;
        dom.requestPointerLock?.();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        const heldMs = performance.now() - this.lmbDownAt;
        if (this.mode === 'playing' && heldMs < 180 && this.lmbDragDist < 7) {
          this.triggerAttack();
        }
        this.lmbDown = false;
      } else if (e.button === 2) {
        const heldMs = performance.now() - this.rmbDownAt;
        if (this.mode === 'playing' && this.rmbJumpTap && heldMs < 210 && this.rmbDragDist < 10) {
          this.triggerJump();
        }
        this.rmbDown = false;
      }
      if (!this.lmbDown && !this.rmbDown && document.pointerLockElement === dom) {
        document.exitPointerLock?.();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.mode !== 'playing') return;
      if (!this.lmbDown && !this.rmbDown) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      const stepDist = Math.hypot(dx, dy);
      if (this.lmbDown) this.lmbDragDist += stepDist;
      if (this.rmbDown) this.rmbDragDist += stepDist;
      this.camYaw -= dx * 0.0042;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0036, 0.14, 1.24);
      if (this.rmbDown) {
        this.playerYaw = this.camYaw;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (this.mode !== 'playing') return;
      this.targetCamDist = THREE.MathUtils.clamp(this.targetCamDist + e.deltaY * 0.01, 6.5, 22);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onBlur = () => {
      this.keysDown.clear();
      this.lmbDown = false;
      this.rmbDown = false;
      if (document.pointerLockElement === dom) {
        document.exitPointerLock?.();
      }
    };

    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer?.setSize(w, h);
      this.bloomPass?.resolution.set(Math.floor(w / 2), Math.floor(h / 2));
      this.renderer.render(this.scene, this.camera);
      if (this.mode === 'playing') {
        this.pushHud(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('wheel', onWheel, { passive: true });
    dom.addEventListener('contextmenu', onContextMenu);

    (this as unknown as { _cleanup: () => void })._cleanup = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
    };
  }

  private startLoop(): void {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.destroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.destroyed) return;
      const nowMs = performance.now();
      const rawDt = Math.max(0.001, (nowMs - this.lastTimeMs) / 1000);
      this.lastTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.05);
      this.elapsedSec += dt;

      this.update(dt, this.elapsedSec);

      if (this.isSoftwareGl || !this.composer || (this.quality !== 'high' && this.quality !== 'cinematic')) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.composer.render();
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number, elapsed: number): void {
    this.waterUniforms.uTime.value = elapsed;

    // Animate harbor environment (always alive even on Title Screen)
    this.polinaShip.position.y = -1.0 + Math.sin(elapsed * 0.85) * 0.14;
    this.polinaShip.rotation.z = Math.sin(elapsed * 0.65) * 0.015;
    this.airships.forEach((ship, i) => {
      ship.position.x += dt * (i === 0 ? 1.4 : -1.1);
      if (ship.position.x > 65) ship.position.x = -65;
      if (ship.position.x < -65) ship.position.x = 65;
      ship.position.y += Math.sin(elapsed * 0.9 + i) * 0.008;
    });

    // Flickering harbor lights
    this.flickerLights.forEach((pt, idx) => {
      pt.intensity = 5.8 + Math.sin(elapsed * 7.5 + idx * 1.9) * 0.8 + Math.cos(elapsed * 13 + idx) * 0.4;
    });

    // Update floating gold dust particles
    if (this.dustInstanced.visible) {
      const count = this.dustInstanced.count;
      for (let i = 0; i < count; i++) {
        const bx = this.dustOffsets[i * 3];
        const by = this.dustOffsets[i * 3 + 1];
        const bz = this.dustOffsets[i * 3 + 2];
        _v1.set(
          bx + Math.sin(elapsed * 0.4 + i) * 0.7,
          by + Math.sin(elapsed * 0.7 + i * 0.6) * 0.4,
          bz + Math.cos(elapsed * 0.35 + i) * 0.7,
        );
        _quat.identity();
        _scale.setScalar(0.85 + Math.sin(elapsed * 2 + i) * 0.25);
        _mat4.compose(_v1, _quat, _scale);
        this.dustInstanced.setMatrixAt(i, _mat4);
      }
      this.dustInstanced.instanceMatrix.needsUpdate = true;
    }

    // Update pooled sparks only while active (zero GPU upload when idle)
    if (this.sparksActive || this.sparksNeedClear) {
      let anyActiveSpark = false;
      for (let i = 0; i < this.sparks.length; i++) {
        const p = this.sparks[i];
        if (p.life > 0) {
          anyActiveSpark = true;
          p.life -= dt;
          p.vel.y -= 14 * dt;
          p.pos.addScaledVector(p.vel, dt);
          const alpha = Math.max(0, p.life / p.maxLife);
          _quat.identity();
          _scale.setScalar(p.scale * alpha);
          _mat4.compose(p.pos, _quat, _scale);
          this.sparkInstanced.setMatrixAt(i, _mat4);
          this.sparkInstanced.setColorAt(i, p.color);
        } else {
          _v1.set(0, -100, 0);
          _quat.identity();
          _scale.setScalar(0);
          _mat4.compose(_v1, _quat, _scale);
          this.sparkInstanced.setMatrixAt(i, _mat4);
        }
      }
      this.sparkInstanced.instanceMatrix.needsUpdate = true;
      if (anyActiveSpark && this.sparkInstanced.instanceColor) {
        this.sparkInstanced.instanceColor.needsUpdate = true;
      }
      this.sparksNeedClear = anyActiveSpark;
      this.sparksActive = anyActiveSpark;
    }

    // Update pooled metal debris chunks only while active (zero GPU upload when idle)
    if (this.debrisActive || this.debrisNeedClear) {
      let anyActiveDebris = false;
      for (let i = 0; i < this.debris.length; i++) {
        const d = this.debris[i];
        if (d.life > 0) {
          anyActiveDebris = true;
          d.life -= dt;
          d.vel.y -= 18 * dt;
          d.pos.addScaledVector(d.vel, dt);
          if (d.pos.y <= 0.08 && d.vel.y < 0) {
            d.pos.y = 0.08;
            d.vel.y *= -0.42;
            d.vel.x *= 0.72;
            d.vel.z *= 0.72;
          }
          d.rot.x += d.rotVel.x * dt;
          d.rot.y += d.rotVel.y * dt;
          d.rot.z += d.rotVel.z * dt;
          const fade = Math.min(1, (d.life / d.maxLife) * 2.2);
          _quat.setFromEuler(d.rot);
          _scale.setScalar(d.scale * fade);
          _mat4.compose(d.pos, _quat, _scale);
          this.debrisInstanced.setMatrixAt(i, _mat4);
        } else {
          _v1.set(0, -100, 0);
          _quat.identity();
          _scale.setScalar(0);
          _mat4.compose(_v1, _quat, _scale);
          this.debrisInstanced.setMatrixAt(i, _mat4);
        }
      }
      this.debrisInstanced.instanceMatrix.needsUpdate = true;
      this.debrisNeedClear = anyActiveDebris;
      this.debrisActive = anyActiveDebris;
    }

    if (this.loreToastTimer > 0) {
      this.loreToastTimer -= dt;
      if (this.loreToastTimer <= 0) this.loreToast = null;
    }
    if (this.subQuestHintTimer > 0) {
      this.subQuestHintTimer -= dt;
      if (this.subQuestHintTimer <= 0) this.subQuestHint = null;
    }

    // Title mode: dramatic orbital flyover showcasing Polina L. & Gantry Crane on right half
    if (this.mode === 'title') {
      this.cranePreviewRing.visible = false;
      this.titleOrbitAngle += dt * 0.14;
      const angle = this.titleOrbitAngle + 0.55;
      const rx = Math.sin(angle) * 26;
      const rz = Math.cos(angle) * 24;
      this.camera.position.set(rx - 2, 10.5 + Math.sin(elapsed * 0.4) * 1.1, rz);
      this.camera.lookAt(-9, 4.2, -7);
      return;
    }

    if (this.mode !== 'playing') {
      this.cranePreviewRing.visible = false;
      return;
    }

    // Screen trauma decay, FOV kick decay & hitstop freeze
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.fovKick = THREE.MathUtils.damp(this.fovKick, 0, 10, dt);
    this.obstacleHitCooldown = Math.max(0, this.obstacleHitCooldown - dt);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    // Cooldowns, Combo decay & VFX
    this.craneCooldown = Math.max(0, this.craneCooldown - dt);
    this.grappleCooldown = Math.max(0, this.grappleCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashInvulnTimer = Math.max(0, this.dashInvulnTimer - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    this.energy = Math.min(this.maxEnergy, this.energy + dt * 12);

    if (this.craneDropAnim > 0) {
      this.craneDropAnim = Math.max(0, this.craneDropAnim - dt * 1.7);
      const dropY = this.craneDropAnim > 0.6 ? 1.5 : THREE.MathUtils.lerp(6.5, 1.5, this.craneDropAnim / 0.6);
      this.crane.beamGroup.position.y = dropY;
    } else {
      this.crane.beamGroup.position.y = THREE.MathUtils.damp(this.crane.beamGroup.position.y, 6.5, 6, dt);
    }

    // Pulse Crane ground drop reticle & Player Crane target preview reticle
    const retMat = this.crane.dropReticle.material as THREE.MeshBasicMaterial;
    retMat.opacity = this.craneCooldown <= 0 ? 0.35 + Math.sin(elapsed * 5) * 0.14 : 0.12;
    this.crane.dropReticle.position.x = this.crane.trolley.position.x;

    this.cranePreviewRing.visible = this.craneCooldown <= 0;
    if (this.cranePreviewRing.visible) {
      const px = this.playerPos.x - Math.sin(this.playerYaw) * 5.2;
      const pz = this.playerPos.z - Math.cos(this.playerYaw) * 5.2;
      this.cranePreviewRing.position.set(px, 0.06, pz);
      const cpMat = this.cranePreviewRing.material as THREE.MeshBasicMaterial;
      cpMat.color.setHex(this.energy >= 80 ? 0x38bdf8 : 0xf2cb77);
      cpMat.opacity = 0.36 + Math.sin(elapsed * 5.5) * 0.14;
    }

    if (this.craneShockTimer > 0) {
      this.craneShockTimer -= dt;
      const t = 1 - this.craneShockTimer / 0.42;
      this.craneShockDome.scale.setScalar(1 + t * 4.2);
      (this.craneShockDome.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.82;
    } else {
      (this.craneShockDome.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer -= dt;
      const t = 1 - this.shockwaveTimer / 0.45;
      this.shockwaveRing.scale.setScalar(1 + t * 5.2);
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
    } else {
      (this.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    if (this.strikeArcTimer > 0) {
      this.strikeArcTimer -= dt;
      const t = Math.max(0, this.strikeArcTimer / 0.18);
      (this.strikeArcMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.88;
      if (this.strikeArcTimer <= 0) this.strikeArcMesh.visible = false;
    }

    if (this.grappleTimer > 0) {
      this.grappleTimer -= dt;
      if (this.grappleTimer <= 0) this.grappleLine.visible = false;
    }

    // Player Movement (Dash override OR WASD camera-relative + LMB&RMB + Touch)
    let fwd = 0;
    let right = 0;
    if (this.keysDown.has(this.keybindings.moveForward) || (this.lmbDown && this.rmbDown)) fwd += 1;
    if (this.keysDown.has(this.keybindings.moveBackward)) fwd -= 1;
    if (this.keysDown.has(this.keybindings.strafeRight)) right += 1;
    if (this.keysDown.has(this.keybindings.strafeLeft)) right -= 1;

    if (Math.abs(this.virtualMoveZ) > 0.1) fwd -= this.virtualMoveZ;
    if (Math.abs(this.virtualMoveX) > 0.1) right += this.virtualMoveX;

    const moveVec = computeCameraMovementVector(this.camYaw, fwd, right);
    const baseMoveSpeed = 8.4 * this.relicBonuses.moveSpeedMult;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpeed = 24.5 * this.relicBonuses.moveSpeedMult;
      this.movePlayerWithCollisions(this.dashDir.x * dashSpeed * dt, this.dashDir.y * dashSpeed * dt);
    } else if (moveVec.speedScale > 0) {
      const stepX = moveVec.x * baseMoveSpeed * moveVec.speedScale * dt;
      const stepZ = moveVec.z * baseMoveSpeed * moveVec.speedScale * dt;
      this.movePlayerWithCollisions(stepX, stepZ);
      this.walkPhase += Math.hypot(stepX, stepZ) * 2.1;

      if (this.rmbDown) {
        this.playerYaw = this.camYaw;
      } else if (fwd >= 0 && right === 0) {
        const targetYaw = Math.atan2(-moveVec.x, -moveVec.z);
        const diff = Math.atan2(Math.sin(targetYaw - this.playerYaw), Math.cos(targetYaw - this.playerYaw));
        this.playerYaw += diff * Math.min(1, dt * 10);
      }
    }

    // Jump with Coyote time & Input buffering
    if (this.onGround) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVelY = 10.6;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.squashX = 0.84;
      this.squashY = 1.2;
      this.trauma = Math.min(1, this.trauma + 0.12);
      this.spawnSparks(this.playerPos.x, 0.1, this.playerPos.z, 6, 0xd4a448);
      soundEngine.playJump();
    }

    // Gravity & heavy iron landing feedback
    if (!this.onGround) {
      this.playerVelY -= 26 * dt;
      this.playerPos.y += this.playerVelY * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelY = 0;
        this.onGround = true;
        this.squashX = 1.24;
        this.squashY = 0.76;
        this.trauma = Math.min(1, this.trauma + 0.18);
        soundEngine.playHeavyLand();
        this.spawnSparks(this.playerPos.x, 0.1, this.playerPos.z, 9, 0x9aa4b2);
      }
    }

    // Squash-and-stretch recovery & articulated walk cycle + thruster exhaust glow
    this.squashX = THREE.MathUtils.damp(this.squashX, 1, 14, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);

    this.hero.group.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.hero.bodyPivot.position.y =
      this.playerPos.y +
      (moveVec.speedScale > 0 && this.onGround ? Math.abs(Math.sin(this.walkPhase)) * 0.08 : Math.sin(elapsed * 2.2) * 0.025);
    this.hero.bodyPivot.rotation.y = this.playerYaw;
    this.hero.bodyPivot.scale.set(this.squashX, this.squashY, this.squashX);
    this.hero.shadowDisc.scale.setScalar(Math.max(0.45, 1 - this.playerPos.y * 0.14));

    const thrustMat = this.hero.thrusterGlow.material as THREE.MeshBasicMaterial;
    const isDashing = this.dashTimer > 0;
    const isMoving = moveVec.speedScale > 0;
    this.hero.thrusterGlow.scale.setScalar(isDashing ? 1.85 : isMoving ? 1.15 : 0.75);
    thrustMat.opacity = isDashing ? 1.0 : isMoving ? 0.75 : 0.38;
    thrustMat.color.setHex(this.energy >= 80 ? 0xa3e635 : 0xff6b1a);
    (this.hero.beaconLight.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.6 + Math.sin(elapsed * 5.2) * 0.9;

    // Live counterweight balance oscillator for engineering Crane & Hoist calibration
    this.rigOscPhase += dt * (this.currentChapterId === 'prolog' ? 2.1 : 2.6);
    this.rigStability = Math.round(50 + Math.sin(this.rigOscPhase) * 46);

    // Orbit Field Assist Drone (#5) on Artem's left flank & boost hydraulics near active relays
    const droneTargetX = this.playerPos.x - Math.cos(this.playerYaw) * 1.45 + Math.sin(elapsed * 1.4) * 0.24;
    const droneTargetY = this.playerPos.y + 1.85 + Math.sin(elapsed * 2.8) * 0.14;
    const droneTargetZ = this.playerPos.z + Math.sin(this.playerYaw) * 1.45 + Math.cos(elapsed * 1.4) * 0.24;
    this.assistDrone.group.position.x = THREE.MathUtils.damp(this.assistDrone.group.position.x, droneTargetX, 6, dt);
    this.assistDrone.group.position.y = THREE.MathUtils.damp(this.assistDrone.group.position.y, droneTargetY, 6, dt);
    this.assistDrone.group.position.z = THREE.MathUtils.damp(this.assistDrone.group.position.z, droneTargetZ, 6, dt);
    this.assistDrone.rotorLeft.rotation.y += dt * 16;
    this.assistDrone.rotorRight.rotation.y -= dt * 16;
    this.assistDrone.body.rotation.y = this.playerYaw;
    const nearAnyRelay = this.interactables.some(
      (n) => !n.completed && n.position.distanceTo(this.playerPos) <= 12,
    );
    const eyeMat = this.assistDrone.eyeMesh.material as THREE.MeshStandardMaterial;
    eyeMat.emissive.setHex(nearAnyRelay ? 0xa3e635 : 0xff6b1a);
    eyeMat.emissiveIntensity = nearAnyRelay ? 2.8 + Math.sin(elapsed * 7) * 0.6 : 1.8;
    if (nearAnyRelay) {
      this.energy = Math.min(this.maxEnergy, this.energy + dt * 2.5);
    }

    const swing = moveVec.speedScale > 0 && this.onGround ? Math.sin(this.walkPhase) * 0.55 : 0;
    this.hero.leftLeg.rotation.x = swing;
    this.hero.rightLeg.rotation.x = -swing;
    if (this.attackCooldown <= 0.14) {
      this.hero.leftArm.rotation.x = THREE.MathUtils.damp(this.hero.leftArm.rotation.x, -swing * 0.7, 14, dt);
      this.hero.rightArm.rotation.x = THREE.MathUtils.damp(this.hero.rightArm.rotation.x, swing * 0.7, 14, dt);
    }

    // Spin & pulse interactable cargo crates + lever snap animation
    for (const node of this.interactables) {
      node.coreOrb.rotation.y += dt * (node.completed ? 0.5 : 1.7);
      node.coreOrb.position.y = (node.completed ? 1.35 : 1.65) + Math.sin(elapsed * 2.8 + node.position.x) * 0.12;
      const targetLever = node.completed ? 0.58 : -0.52;
      node.leverPivot.rotation.x = THREE.MathUtils.damp(node.leverPivot.rotation.x, targetLever, 12, dt);
      if (!node.completed) {
        node.groundRing.scale.setScalar(1 + Math.sin(elapsed * 4.5) * 0.08);
      } else {
        node.groundRing.scale.setScalar(0.8);
      }
    }

    this.updatePickups(dt, elapsed);
    this.updateArenaObstacles(dt, elapsed);
    this.updateEnemies(dt, elapsed);
    this.updateProjectiles(dt);
    this.updateFloatingTexts(dt);
    this.updateCamera(dt);
    this.pushHud(false);
  }

  private updatePickups(dt: number, elapsed: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.core.rotation.y += dt * 2.6;
      p.core.position.y = 0.65 + Math.sin(elapsed * 4 + p.id) * 0.14;
      p.ring.scale.setScalar(1 + Math.sin(elapsed * 5 + p.id) * 0.12);

      const dx = this.playerPos.x - p.pos.x;
      const dz = this.playerPos.z - p.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 3.4 && dist > 0.01) {
        const pull = 9.5 * dt;
        p.pos.x += (dx / dist) * pull;
        p.pos.z += (dz / dist) * pull;
      }

      if (dist <= 1.35) {
        p.collected = true;
        if (p.kind === 'hp') {
          this.hp = Math.min(this.maxHp, this.hp + 20);
          this.addFloatingText(this.playerPos, '+20 HP', '#34d399');
        } else {
          this.energy = Math.min(this.maxEnergy, this.energy + 35);
          this.addFloatingText(this.playerPos, '+35 HYD · +2,500 AK', '#38bdf8');
          this.callbacks.onInteractBonusAK(2500);
        }
        soundEngine.playPickup();
        this.spawnSparks(p.pos.x, 0.8, p.pos.z, 10, p.kind === 'hp' ? 0x34d399 : 0x38bdf8);
      }

      if (p.collected || p.life <= 0) {
        this.scene.remove(p.group);
        disposeObjectTree(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateArenaObstacles(dt: number, elapsed: number): void {
    for (const ob of this.arenaObstacles) {
      const t = elapsed * ob.speed + ob.phase;
      const teleMat = ob.telegraphMesh.material as THREE.MeshBasicMaterial;
      let hazardX = ob.basePos.x;
      let hazardZ = ob.basePos.z;
      let hazardActive = true;

      if (ob.kind === 'steam_vent') {
        const cycle = (Math.sin(t * 1.4) + 1) * 0.5; // 0..1
        hazardActive = cycle > 0.62;
        ob.hazardMesh.visible = hazardActive;
        ob.hazardMesh.scale.y = 0.7 + cycle * 0.5;
        teleMat.color.setHex(hazardActive ? 0xef4444 : 0xf97316);
        teleMat.opacity = hazardActive ? 0.78 : 0.28 + cycle * 0.3;
      } else if (ob.kind === 'swinging_beam') {
        const ang = Math.sin(t * 1.25) * 0.95;
        if (ob.axis === 'x') {
          ob.hazardMesh.rotation.z = ang;
          hazardX = ob.basePos.x + Math.sin(ang) * 6.5;
        } else {
          ob.hazardMesh.rotation.x = ang;
          hazardZ = ob.basePos.z - Math.sin(ang) * 6.5;
        }
        hazardActive = Math.abs(Math.cos(t * 1.25)) > 0.35;
        teleMat.opacity = 0.45;
      } else if (ob.kind === 'moving_press') {
        const offset = Math.sin(t * 1.15) * 5.2;
        if (ob.axis === 'x') {
          ob.hazardMesh.position.x = offset;
          ob.telegraphMesh.position.x = offset;
          hazardX = ob.basePos.x + offset;
        } else {
          ob.hazardMesh.position.z = offset;
          ob.telegraphMesh.position.z = offset;
          hazardZ = ob.basePos.z + offset;
        }
        teleMat.opacity = 0.52;
      } else {
        // laser_cordon
        ob.hazardMesh.rotation.y = t * 0.95;
        const dx = this.playerPos.x - ob.basePos.x;
        const dz = this.playerPos.z - ob.basePos.z;
        const dist = Math.hypot(dx, dz);
        const beamAngle = ob.hazardMesh.rotation.y;
        const bx = Math.cos(beamAngle);
        const bz = -Math.sin(beamAngle);
        const perpDist = Math.abs(dx * -bz + dz * bx);
        const alongDist = Math.abs(dx * bx + dz * bz);
        hazardActive = dist < ob.hitRadius && alongDist <= 3.6 && perpDist <= 0.65 && this.playerPos.y < 1.25;
        teleMat.opacity = 0.4;
      }

      if (this.obstacleHitCooldown <= 0 && hazardActive) {
        const dist = Math.hypot(this.playerPos.x - hazardX, this.playerPos.z - hazardZ);
        const jumpSafe = (ob.kind === 'steam_vent' || ob.kind === 'laser_cordon') && this.playerPos.y > 1.35;
        if (!jumpSafe && (ob.kind === 'laser_cordon' || dist <= ob.hitRadius)) {
          this.obstacleHitCooldown = 0.9;
          this.damagePlayer(10);
          _v1.set(this.playerPos.x - hazardX, 0, this.playerPos.z - hazardZ);
          if (_v1.lengthSq() > 0.001) {
            _v1.normalize();
            this.movePlayerWithCollisions(_v1.x * 1.8, _v1.z * 1.8);
          }
        }
      }
      void dt;
    }
  }

  private movePlayerWithCollisions(dx: number, dz: number): void {
    const nextX = THREE.MathUtils.clamp(this.playerPos.x + dx, -26.5, 26.5);
    const nextZ = THREE.MathUtils.clamp(this.playerPos.z + dz, -26.5, 26.5);
    let blockedX = false;
    let blockedZ = false;
    const r = 0.65;

    for (const ob of this.obstacles) {
      if (Math.abs(nextX - ob.x) < ob.rx + r && Math.abs(this.playerPos.z - ob.z) < ob.rz + r) {
        blockedX = true;
      }
      if (Math.abs(this.playerPos.x - ob.x) < ob.rx + r && Math.abs(nextZ - ob.z) < ob.rz + r) {
        blockedZ = true;
      }
    }
    if (!blockedX) this.playerPos.x = nextX;
    if (!blockedZ) this.playerPos.z = nextZ;
  }

  private updateEnemies(dt: number, elapsed: number): void {
    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (!e.dead && e.windupActive) activeAttackers++;
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) {
        if (enemy.koTimer > 0) {
          enemy.koTimer -= dt;
          const p = Math.max(0, enemy.koTimer / 0.42);
          enemy.bodyGroup.scale.setScalar(p);
          enemy.bodyGroup.rotation.x += dt * 4.5;
          if (enemy.koTimer <= 0) {
            enemy.group.visible = false;
          }
        }
        continue;
      }

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          for (const m of enemy.baseMaterialList) {
            m.emissive.setHex(0x000000);
          }
        }
      }

      const toPlayer = _v1.subVectors(this.playerPos, enemy.group.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist > 0.001) toPlayer.divideScalar(dist);

      // Face player
      enemy.bodyGroup.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
      // Walking bob
      enemy.bodyGroup.position.y = Math.sin(elapsed * 5 + enemy.id) * 0.05;

      // 3 distinct movement & decision policies
      if (enemy.archetype === 'enforcer') {
        if (dist > 2.1 && !enemy.windupActive) {
          enemy.group.position.addScaledVector(toPlayer, enemy.speed * dt);
        }
      } else if (enemy.archetype === 'skimmer') {
        enemy.orbitAngle += dt * 1.1;
        const desired = 9.5;
        if (dist > desired + 1.5) {
          enemy.group.position.addScaledVector(toPlayer, enemy.speed * dt);
        } else if (dist < desired - 1.5) {
          enemy.group.position.addScaledVector(toPlayer, -enemy.speed * 0.85 * dt);
        } else {
          _v2.set(-toPlayer.z, 0, toPlayer.x);
          enemy.group.position.addScaledVector(_v2, Math.sin(enemy.orbitAngle) * enemy.speed * 0.7 * dt);
        }
      } else {
        if (dist > 4.2 && !enemy.windupActive) {
          enemy.group.position.addScaledVector(toPlayer, enemy.speed * dt);
        }
      }

      enemy.group.position.x = THREE.MathUtils.clamp(enemy.group.position.x, -25, 25);
      enemy.group.position.z = THREE.MathUtils.clamp(enemy.group.position.z, -25, 25);

      // Attack Telegraph & Crowd Token Pool (max 2 concurrent attackers)
      enemy.attackCooldown -= dt;
      const inRange = enemy.archetype === 'skimmer' ? dist <= 14 : enemy.archetype === 'warden' ? dist <= 5.0 : dist <= 2.7;

      if (!enemy.windupActive && enemy.attackCooldown <= 0 && inRange && activeAttackers < 2) {
        enemy.windupActive = true;
        enemy.windupTimer = enemy.archetype === 'enforcer' ? 0.45 : 0.62;
        activeAttackers++;
        soundEngine.playEnemyTelegraph();
      }

      if (enemy.windupActive) {
        enemy.windupTimer -= dt;
        const ringMat = enemy.telegraphRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.78;
        enemy.telegraphRing.scale.setScalar(1 + (1 - Math.max(0, enemy.windupTimer) / 0.62) * 0.35);

        if (enemy.windupTimer <= 0) {
          enemy.windupActive = false;
          ringMat.opacity = 0;
          enemy.attackCooldown = enemy.archetype === 'skimmer' ? 2.4 : 2.0;

          if (enemy.archetype === 'skimmer') {
            this.spawnEnemyBolt(enemy.group.position, toPlayer);
          } else {
            if (enemy.archetype === 'warden') {
              enemy.group.position.addScaledVector(toPlayer, 2.2);
            }
            const strikeDist = enemy.group.position.distanceTo(this.playerPos);
            if (strikeDist <= 3.0) {
              this.damagePlayer(enemy.archetype === 'warden' ? 16 : 11);
            }
          }
        }
      }
    }
  }

  private spawnEnemyBolt(origin: THREE.Vector3, dir: THREE.Vector3): void {
    let slot = this.boltPool.find((b) => !b.active);
    if (!slot) slot = this.boltPool[0];
    slot.active = true;
    slot.mesh.visible = true;
    slot.pos.set(origin.x, 1.5, origin.z);
    slot.vel.copy(dir).multiplyScalar(11.5);
    slot.life = 2.2;
    slot.damage = 9;
  }

  private updateProjectiles(dt: number): void {
    for (let i = 0; i < this.boltPool.length; i++) {
      const p = this.boltPool[i];
      if (!p.active) continue;
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.distanceTo(this.playerPos) < 1.1 && this.playerPos.y < 1.6) {
        this.damagePlayer(p.damage);
        p.life = 0;
      }
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private damagePlayer(rawDmg: number): void {
    if (this.defeatEmitted || this.chapterDoneEmitted || this.dashInvulnTimer > 0) return;
    const dmg = computeCombatDamage(rawDmg, this.difficulty, false, false);
    this.hp = Math.max(0, this.hp - dmg);
    this.comboCount = 0;
    this.comboTimer = 0;
    this.trauma = Math.min(1, this.trauma + 0.42);
    soundEngine.playHurt();
    this.addFloatingText(this.playerPos, `-${dmg}`, '#dc4c46');
    this.pushHud(true);

    if (this.hp <= 0) {
      this.defeatEmitted = true;
      window.setTimeout(() => {
        if (!this.destroyed) {
          this.callbacks.onPlayerDefeated();
        }
      }, 500);
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.worldPos.y += dt * 1.4;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number): void {
    this.camDist = THREE.MathUtils.damp(this.camDist, this.targetCamDist, 10, dt);

    const targetFov = 54 + this.fovKick;
    if (Math.abs(this.camera.fov - targetFov) > 0.02) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    const targetX = this.playerPos.x;
    const targetY = this.playerPos.y + 1.55;
    const targetZ = this.playerPos.z;
    this.camLookPos.x = THREE.MathUtils.damp(this.camLookPos.x, targetX, 14, dt);
    this.camLookPos.y = THREE.MathUtils.damp(this.camLookPos.y, targetY, 14, dt);
    this.camLookPos.z = THREE.MathUtils.damp(this.camLookPos.z, targetZ, 14, dt);

    const horiz = Math.cos(this.camPitch) * this.camDist;
    const vert = Math.sin(this.camPitch) * this.camDist;
    const shake = this.trauma * this.trauma * 0.45;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    this.camera.position.set(
      this.camLookPos.x + Math.sin(this.camYaw) * horiz + sx,
      this.camLookPos.y + vert + sy,
      this.camLookPos.z + Math.cos(this.camYaw) * horiz,
    );
    this.camera.lookAt(this.camLookPos);
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
  }

  private pushHud(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastHudPush < 100) return;
    this.lastHudPush = now;

    const range = 3.6 + this.relicBonuses.interactRangeBonus;
    let nearInteractable: string | null = null;
    let nearIsBypass = false;
    let nearIsLore = false;
    for (const node of this.interactables) {
      if (!node.completed && node.position.distanceTo(this.playerPos) <= range) {
        nearInteractable = node.label;
        nearIsBypass = node.isBypass;
        nearIsLore = Boolean(node.isLore);
        break;
      }
    }

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const projectedTexts: HudSnapshot['floatingTexts'] = [];
    for (const ft of this.floatingTexts) {
      _proj.copy(ft.worldPos).project(this.camera);
      if (_proj.z < -1 || _proj.z > 1) continue;
      projectedTexts.push({
        id: ft.id,
        text: ft.text,
        x: (_proj.x * 0.5 + 0.5) * w,
        y: (-_proj.y * 0.5 + 0.5) * h,
        color: ft.color,
        life: ft.life,
      });
    }

    let enemiesRemaining = 0;
    const enemyBars: HudSnapshot['enemyBars'] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      enemiesRemaining++;
      if (e.hp < e.maxHp || e.windupActive) {
        _proj.set(e.group.position.x, 2.35, e.group.position.z).project(this.camera);
        if (_proj.z >= -1 && _proj.z <= 1) {
          const sx = (_proj.x * 0.5 + 0.5) * w;
          const sy = (-_proj.y * 0.5 + 0.5) * h;
          if (sx >= 24 && sx <= w - 24 && sy >= 40 && sy <= h - 40) {
            enemyBars.push({
              id: e.id,
              x: sx,
              y: sy,
              hpPct: Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)),
              windup: e.windupActive,
            });
          }
        }
      }
    }

    const objectiveMarkers: HudSnapshot['objectiveMarkers'] = [];
    for (const node of this.interactables) {
      if (node.completed) continue;
      _proj.set(node.position.x, 2.15, node.position.z).project(this.camera);
      const behind = _proj.z > 1;
      const nx = behind ? -_proj.x : _proj.x;
      const ny = behind ? -_proj.y : _proj.y;
      const rawX = (nx * 0.5 + 0.5) * w;
      const rawY = (-ny * 0.5 + 0.5) * h;
      const padX = 44;
      const padTop = 76;
      const padBottom = 92;
      const offscreen = behind || rawX < padX || rawX > w - padX || rawY < padTop || rawY > h - padBottom;
      const sx = THREE.MathUtils.clamp(rawX, padX, w - padX);
      const sy = THREE.MathUtils.clamp(rawY, padTop, h - padBottom);
      const angleRad = Math.atan2(rawY - h * 0.5, rawX - w * 0.5);
      objectiveMarkers.push({
        id: node.id,
        x: sx,
        y: sy,
        isBypass: node.isBypass,
        markerKind: node.isLore ? 'lore' : node.isBypass ? 'bypass' : 'contract',
        offscreen,
        angleRad,
      });
    }

    this.callbacks.onHudUpdate({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      energy: Math.round(this.energy),
      maxEnergy: this.maxEnergy,
      objectivesDone: this.objectivesCleared,
      objectivesTotal: this.objectivesTotal,
      enemiesRemaining,
      score: this.score,
      comboCount: this.comboCount,
      overcharged: this.energy >= 80,
      craneCooldown: Number(this.craneCooldown.toFixed(1)),
      grappleCooldown: Number(this.grappleCooldown.toFixed(1)),
      slamCooldown: Number(this.slamCooldown.toFixed(1)),
      dashCooldown: Number(this.dashCooldown.toFixed(1)),
      nearInteractable,
      nearIsBypass,
      nearIsLore,
      activeTip: null,
      loreToast: this.loreToast,
      subQuestHint: this.subQuestHint,
      rigStability: this.rigStability,
      rigTargetActive: this.currentChapterId === 'prolog' || this.craneCooldown <= 0,
      enemyBars,
      objectiveMarkers,
      floatingTexts: projectedTexts,
    });
  }

  public dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    (this as unknown as { _cleanup?: () => void })._cleanup?.();
    this.clearArenaGroup();
    this.enemies.forEach((e) => disposeObjectTree(e.group));
    this.interactables.forEach((n) => disposeObjectTree(n.group));
    this.arenaObstacles.forEach((o) => disposeObjectTree(o.group));
    this.pickups.forEach((p) => disposeObjectTree(p.group));
    disposeObjectTree(this.hero.group);
    disposeObjectTree(this.assistDrone.group);
    disposeObjectTree(this.polinaShip);
    disposeObjectTree(this.crane.group);
    this.airships.forEach((a) => disposeObjectTree(a));
    disposeObjectTree(this.harborRing);
    disposeObjectTree(this.skyDome);
    disposeObjectTree(this.dustInstanced);
    disposeObjectTree(this.sparkInstanced);
    disposeObjectTree(this.debrisInstanced);
    disposeObjectTree(this.strikeArcMesh);
    disposeObjectTree(this.cranePreviewRing);
    disposeObjectTree(this.craneShockDome);
    disposeObjectTree(this.shockwaveRing);
    disposeObjectTree(this.grappleLine);
    this.boltGeo.dispose();
    this.boltMat.dispose();
    this.textures.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
