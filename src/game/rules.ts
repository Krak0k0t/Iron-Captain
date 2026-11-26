import type {
  AlmanacId,
  CampaignFlags,
  CampaignSave,
  ChapterId,
  DifficultyLevel,
  EndingId,
  Keybindings,
  PartyMemberId,
  PartyState,
  RelicBonuses,
} from './types';

export const CHAPTER_ORDER: ChapterId[] = [
  'prolog',
  '1_1',
  '1_2',
  '1_3',
  '2_1',
  '2_2',
  '2_3',
  '3_1',
  '3_2',
  '3_3',
  '4_1',
  '4_2',
];

export const DEFAULT_KEYBINDINGS: Keybindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  strafeLeft: 'KeyA',
  strafeRight: 'KeyD',
  jump: 'Space',
  attack: 'KeyF',
  dash: 'ShiftLeft',
  skillCrane: 'Digit1',
  skillGrapple: 'Digit2',
  skillSlam: 'Digit3',
  interact: 'KeyE',
  pause: 'Escape',
};

export function createInitialSave(): CampaignSave {
  return {
    version: 1,
    currentChapter: 'prolog',
    unlockedChapters: ['prolog'],
    completedChapters: [],
    rewards: {},
    capitalAK: 12000,
    lockedRealAK: 0,
    surgeryTargetAK: 2300000,
    windowWeeks: 40, // 10 months
    stakePercent: 18,
    fatigue: 0,
    party: {
      yaga: 58,
      nail: 52,
      ledger: 55,
      grandpa: 60,
      theo: 45,
    },
    unlockedAlmanac: ['crane_moment'],
    unlockedLore: [],
    flags: {
      theoJoined: false,
      archiveRecovered: false,
      gatewayFrozen: false,
      captainContractSigned: false,
      finalCranePerfect: false,
      yagaUltimatumTriggered: false,
      grandpaShipyardUpgraded: false,
    },
    bestScore: 0,
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function formatWindowWeeks(weeks: number): { months: number; remWeeks: number } {
  const safe = Math.max(0, Math.round(weeks));
  return {
    months: Math.floor(safe / 4),
    remWeeks: safe % 4,
  };
}

export function applyPartyApproval(
  party: PartyState,
  deltas?: Partial<PartyState>,
): PartyState {
  if (!deltas) return party;
  return {
    yaga: clamp(party.yaga + (deltas.yaga ?? 0), 0, 100),
    nail: clamp(party.nail + (deltas.nail ?? 0), 0, 100),
    ledger: clamp(party.ledger + (deltas.ledger ?? 0), 0, 100),
    grandpa: clamp(party.grandpa + (deltas.grandpa ?? 0), 0, 100),
    theo: clamp(party.theo + (deltas.theo ?? 0), 0, 100),
  };
}

export function getAveragePartyApproval(party: PartyState, includeTheo: boolean): number {
  const members: PartyMemberId[] = includeTheo
    ? ['yaga', 'nail', 'ledger', 'grandpa', 'theo']
    : ['yaga', 'nail', 'ledger', 'grandpa'];
  const sum = members.reduce((acc, id) => acc + party[id], 0);
  return Math.round(sum / members.length);
}

export function isPartyCouncilRevolting(party: PartyState, includeTheo: boolean): boolean {
  return getAveragePartyApproval(party, includeTheo) < 30;
}

export interface ReinvestResult {
  save: CampaignSave;
  netLockedGain: number;
  blockedByGateway: boolean;
}

/**
 * Applies the dual-economy Profit-Gateway lock-in or fleet reinvestment decision.
 * Profit-Gateway takes a 15% fee unless frozen in Act III.
 */
export function applyReinvestOrLock(
  save: CampaignSave,
  mode: 'lock' | 'reinvest',
  amount: number,
): ReinvestResult {
  const spend = clamp(Math.round(amount), 0, save.capitalAK);
  if (mode === 'lock') {
    if (save.flags.gatewayFrozen) {
      return {
        save: { ...save },
        netLockedGain: 0,
        blockedByGateway: true,
      };
    }
    const net = Math.round(spend * 0.85); // 15% Profit-Gateway commission
    const extraWeeks = Math.floor(net / 350000);
    return {
      save: {
        ...save,
        capitalAK: save.capitalAK - spend,
        lockedRealAK: save.lockedRealAK + net,
        stakePercent: clamp(save.stakePercent - 12, 5, 100),
        windowWeeks: clamp(save.windowWeeks + extraWeeks, 1, 48),
      },
      netLockedGain: net,
      blockedByGateway: false,
    };
  }

  // Reinvest grows stake & future yield capacity
  const stakeGain = Math.min(24, Math.max(6, Math.round(spend / 80000)));
  return {
    save: {
      ...save,
      capitalAK: save.capitalAK - spend,
      stakePercent: clamp(save.stakePercent + stakeGain, 5, 100),
      // Reinvesting unlocks higher contract yield on next chapter
      windowWeeks: clamp(save.windowWeeks - 1, 1, 48),
    },
    netLockedGain: 0,
    blockedByGateway: false,
  };
}

/**
 * Unlocks next chapter without erasing any already unlocked future chapters or rewards.
 */
export function completeChapterAndUnlockNext(
  save: CampaignSave,
  chapterId: ChapterId,
  rewardTag?: string,
): CampaignSave {
  const idx = CHAPTER_ORDER.indexOf(chapterId);
  const nextId = idx >= 0 && idx + 1 < CHAPTER_ORDER.length ? CHAPTER_ORDER[idx + 1] : null;

  const completed = save.completedChapters.includes(chapterId)
    ? save.completedChapters
    : [...save.completedChapters, chapterId];

  const unlocked =
    nextId && !save.unlockedChapters.includes(nextId)
      ? [...save.unlockedChapters, nextId]
      : [...save.unlockedChapters];

  const prevRewards = save.rewards[chapterId] ?? [];
  const nextRewards =
    rewardTag && !prevRewards.includes(rewardTag)
      ? { ...save.rewards, [chapterId]: [...prevRewards, rewardTag] }
      : save.rewards;

  return {
    ...save,
    completedChapters: completed,
    unlockedChapters: unlocked,
    rewards: nextRewards,
  };
}

/**
 * Launches a selected chapter safely while preserving all future unlocked chapters and rewards.
 */
export function startSelectedChapterSave(
  save: CampaignSave,
  chapterId: ChapterId,
  minCapitalForChapter: number,
  baselineWindowWeeks: number,
): CampaignSave {
  return {
    ...save,
    currentChapter: chapterId,
    capitalAK: Math.max(save.capitalAK, minCapitalForChapter),
    windowWeeks: Math.max(save.windowWeeks, Math.min(baselineWindowWeeks, save.windowWeeks)),
  };
}

export function unlockAlmanacEntry(
  list: AlmanacId[],
  entry?: AlmanacId,
): AlmanacId[] {
  if (!entry || list.includes(entry)) return list;
  return [...list, entry];
}

export function updateFlags(
  flags: CampaignFlags,
  patch?: Partial<CampaignFlags>,
): CampaignFlags {
  if (!patch) return flags;
  return { ...flags, ...patch };
}

/**
 * Computes camera-relative horizontal movement vector on XZ plane (Three.js right-handed coords).
 * Camera yaw = 0 looks toward -Z (forward = (-sin(yaw), 0, -cos(yaw))).
 * Right vector = (cos(yaw), 0, -sin(yaw)).
 */
export function computeCameraMovementVector(
  cameraYaw: number,
  forwardInput: number, // +1 for W, -1 for S
  rightInput: number,   // +1 for D (strafe right), -1 for A (strafe left)
): { x: number; z: number; speedScale: number } {
  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  // Backpedal (S) moves slower than forward/strafe
  const effectiveFwd = forwardInput < 0 ? forwardInput * 0.62 : forwardInput;

  const rx = fwdX * effectiveFwd + rightX * rightInput;
  const rz = fwdZ * effectiveFwd + rightZ * rightInput;
  const len = Math.hypot(rx, rz);
  if (len < 1e-5) {
    return { x: 0, z: 0, speedScale: 0 };
  }
  const speedScale = forwardInput < 0 && rightInput === 0 ? 0.62 : 1.0;
  return {
    x: rx / len,
    z: rz / len,
    speedScale,
  };
}

export function computeCombatDamage(
  baseDamage: number,
  difficulty: DifficultyLevel,
  isFromPlayer: boolean,
  isCraneMoment = false,
): number {
  const diffMult =
    difficulty === 'story'
      ? isFromPlayer
        ? 1.35
        : 0.6
      : difficulty === 'hardcore'
        ? isFromPlayer
          ? 0.85
          : 1.45
        : 1.0;
  const craneMult = isCraneMoment ? 2.4 : 1.0;
  return Math.max(1, Math.round(baseDamage * diffMult * craneMult));
}

export function calculateEnding(save: CampaignSave): EndingId {
  const totalFunds = save.lockedRealAK + (save.flags.gatewayFrozen ? 0 : save.capitalAK * 0.85);
  const avgApproval = getAveragePartyApproval(save.party, save.flags.theoJoined);

  // E5 (Secret): Forgave Theo + Perfect Final Crane Moment + Archive Recovered
  if (
    save.flags.theoChoice === 'forgive' &&
    save.flags.finalCranePerfect &&
    save.flags.archiveRecovered &&
    !save.flags.captainContractSigned
  ) {
    return 'E5';
  }

  // E1: Signed Captain's Contract & high capital
  if (save.flags.captainContractSigned && (save.capitalAK + save.lockedRealAK) >= 1800000) {
    return 'E1';
  }

  // E2: Archive delivered + strong party + enough capital for discounted surgery
  if (save.flags.archiveRecovered && avgApproval >= 55 && (save.capitalAK + save.lockedRealAK) >= 1400000) {
    return 'E2';
  }

  // E3: Archive lost / vengeance route with Nail
  if (!save.flags.archiveRecovered && save.party.nail >= 50 && save.flags.theoChoice === 'kick') {
    return 'E3';
  }

  // E4: Critical Window or insufficient funds — party pools money to keep Artem alive
  if (totalFunds < save.surgeryTargetAK || save.windowWeeks <= 4) {
    return 'E4';
  }

  return 'E2';
}

export function getOwnedRelics(save: Pick<CampaignSave, 'rewards'>): string[] {
  const set = new Set<string>();
  for (const list of Object.values(save.rewards)) {
    if (Array.isArray(list)) {
      for (const r of list) set.add(r);
    }
  }
  return Array.from(set);
}

/**
 * Translates Catalogued Relics into concrete combat/navigation buffs & sector bypass routes.
 */
export function computeRelicBonuses(save: Pick<CampaignSave, 'rewards'>): RelicBonuses {
  const owned = getOwnedRelics(save);
  const has = (id: string) => owned.includes(id);

  let moveSpeedMult = 1.0;
  let maxHpBonus = 0;
  let craneCooldownMult = 1.0;
  let craneDamageMult = 1.0;
  let craneRadiusBonus = 0;
  let grappleCooldownMult = 1.0;
  let slamCooldownMult = 1.0;
  let interactRangeBonus = 0;
  let bonusAkMult = 1.0;
  const unlockedBypasses: string[] = [];

  if (has('dispatch_badge')) {
    interactRangeBonus += 0.9;
    bonusAkMult += 0.25;
    unlockedBypasses.push('dispatch_chute');
  }
  if (has('hand_truck')) {
    moveSpeedMult += 0.16;
    maxHpBonus += 15;
    unlockedBypasses.push('freight_ramp');
  }
  if (has('gantry_key')) {
    craneCooldownMult *= 0.76;
    craneDamageMult += 0.25;
    craneRadiusBonus += 1.4;
    unlockedBypasses.push('overhead_gantry');
  }
  if (has('polina_deed')) {
    grappleCooldownMult *= 0.8;
    maxHpBonus += 15;
    unlockedBypasses.push('polina_mooring');
  }
  if (has('auction_cipher')) {
    bonusAkMult += 0.25;
    slamCooldownMult *= 0.85;
  }
  if (has('tournament_pennant')) {
    slamCooldownMult *= 0.82;
    moveSpeedMult += 0.08;
  }
  if (has('abyssal_pass')) {
    maxHpBonus += 20;
    unlockedBypasses.push('caisson_seam');
  }
  if (has('centurion_manifest')) {
    grappleCooldownMult *= 0.85;
    craneDamageMult += 0.15;
  }
  if (has('broadcast_clip')) {
    bonusAkMult += 0.2;
  }
  if (has('atlas_archive')) {
    craneCooldownMult *= 0.88;
    slamCooldownMult *= 0.88;
    unlockedBypasses.push('archive_backdoor');
  }
  if (has('crew_oath')) {
    maxHpBonus += 25;
    moveSpeedMult += 0.06;
  }
  if (has('iron_crown')) {
    craneDamageMult += 0.2;
    grappleCooldownMult *= 0.85;
  }

  return {
    moveSpeedMult: Number(moveSpeedMult.toFixed(2)),
    maxHpBonus,
    craneCooldownMult: Number(craneCooldownMult.toFixed(2)),
    craneDamageMult: Number(craneDamageMult.toFixed(2)),
    craneRadiusBonus: Number(craneRadiusBonus.toFixed(2)),
    grappleCooldownMult: Number(grappleCooldownMult.toFixed(2)),
    slamCooldownMult: Number(slamCooldownMult.toFixed(2)),
    interactRangeBonus: Number(interactRangeBonus.toFixed(2)),
    bonusAkMult: Number(bonusAkMult.toFixed(2)),
    unlockedBypasses,
    ownedRelics: owned,
  };
}

export function computeComboMultiplier(comboCount: number): number {
  if (comboCount <= 1) return 1.0;
  return Number(Math.min(2.5, 1 + (comboCount - 1) * 0.15).toFixed(2));
}

export function computeOverchargeBonus(
  baseDamage: number,
  energy: number,
): { damage: number; overcharged: boolean; energyCost: number } {
  if (energy >= 80) {
    return {
      damage: Math.round(baseDamage * 1.25),
      overcharged: true,
      energyCost: 35,
    };
  }
  return {
    damage: baseDamage,
    overcharged: false,
    energyCost: 0,
  };
}

export function computeDashVector(
  moveX: number,
  moveZ: number,
  playerYaw: number,
): { x: number; z: number } {
  const len = Math.hypot(moveX, moveZ);
  if (len > 0.05) {
    return { x: moveX / len, z: moveZ / len };
  }
  return { x: -Math.sin(playerYaw), z: -Math.cos(playerYaw) };
}

export function unlockLoreEntry(
  list: ChapterId[] | undefined,
  chapterId?: ChapterId,
): ChapterId[] {
  const current = Array.isArray(list) ? list : [];
  if (!chapterId || current.includes(chapterId)) return current;
  return [...current, chapterId];
}

export function computeSubQuestBonus(triggerCount: number): number {
  if (triggerCount <= 0) return 0;
  return Math.min(25000, Math.round(triggerCount * 5000));
}

/**
 * Evaluates engineering counterweight rigging stability when hoisting/dropping a suspended beam.
 * Center sweet spot is [28..72] out of 100.
 */
export function evaluateCraneBalanceDrop(balanceVal: number): {
  stable: boolean;
  bonusMult: number;
  label: 'LOCKED' | 'TILTED';
} {
  const clamped = clamp(balanceVal, 0, 100);
  const offset = Math.abs(clamped - 50);
  if (offset <= 22) {
    return {
      stable: true,
      bonusMult: offset <= 10 ? 1.5 : 1.25,
      label: 'LOCKED',
    };
  }
  return {
    stable: false,
    bonusMult: 0.75,
    label: 'TILTED',
  };
}

/**
 * Generates deterministic Twin-4 Futures commodities reacting to Stake volatility.
 */
export function generateTwin4Ticker(stakePercent: number, tickIndex: number): Array<{
  symbol: string;
  price: number;
  deltaPct: number;
}> {
  const volFactor = 0.6 + (clamp(stakePercent, 5, 100) / 100) * 1.4;
  const wave = (seed: number) => Math.sin((tickIndex + seed) * 0.85) * volFactor;
  return [
    {
      symbol: 'H2-CELL',
      price: Math.round(420 + wave(1) * 34),
      deltaPct: Number((wave(1) * 4.8).toFixed(1)),
    },
    {
      symbol: 'SLING-FE',
      price: Math.round(185 + wave(2.4) * 19),
      deltaPct: Number((wave(2.4) * 5.6).toFixed(1)),
    },
    {
      symbol: 'CRANE-TON',
      price: Math.round(910 + wave(4.1) * 62),
      deltaPct: Number((wave(4.1) * 3.9).toFixed(1)),
    },
    {
      symbol: 'GATE-FEE',
      price: 15,
      deltaPct: stakePercent > 65 ? 2.5 : 0.0,
    },
  ];
}


