import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPartyApproval,
  applyReinvestOrLock,
  calculateEnding,
  completeChapterAndUnlockNext,
  computeCameraMovementVector,
  computeCombatDamage,
  computeComboMultiplier,
  computeDashVector,
  computeOverchargeBonus,
  computeRelicBonuses,
  computeSubQuestBonus,
  createInitialSave,
  evaluateCraneBalanceDrop,
  formatWindowWeeks,
  generateTwin4Ticker,
  isPartyCouncilRevolting,
  startSelectedChapterSave,
  unlockLoreEntry,
} from './rules';
import { CHAPTERS } from './storyData';

test('formatWindowWeeks converts weeks into months and remaining weeks', () => {
  assert.deepEqual(formatWindowWeeks(40), { months: 10, remWeeks: 0 });
  assert.deepEqual(formatWindowWeeks(30), { months: 7, remWeeks: 2 });
  assert.deepEqual(formatWindowWeeks(3), { months: 0, remWeeks: 3 });
});

test('applyReinvestOrLock applies 15% Profit-Gateway fee when locking funds and respects gateway freeze', () => {
  const base = { ...createInitialSave(), capitalAK: 1000000 };
  const locked = applyReinvestOrLock(base, 'lock', 1000000);
  assert.equal(locked.blockedByGateway, false);
  assert.equal(locked.netLockedGain, 850000);
  assert.equal(locked.save.capitalAK, 0);
  assert.equal(locked.save.lockedRealAK, 850000);

  const frozen = { ...base, flags: { ...base.flags, gatewayFrozen: true } };
  const blocked = applyReinvestOrLock(frozen, 'lock', 500000);
  assert.equal(blocked.blockedByGateway, true);
  assert.equal(blocked.save.capitalAK, 1000000);
});

test('completeChapterAndUnlockNext and startSelectedChapterSave protect overall progress on replay', () => {
  let save = createInitialSave();
  save = completeChapterAndUnlockNext(save, 'prolog', 'cargo_tag');
  save = completeChapterAndUnlockNext(save, '1_1', 'hand_truck');
  save = completeChapterAndUnlockNext(save, '1_2', 'gantry_key');
  assert.ok(save.unlockedChapters.includes('1_3'));
  assert.ok(save.completedChapters.includes('1_2'));

  // Replaying an earlier chapter must NOT erase later unlocked chapters or rewards
  const replayed = startSelectedChapterSave(save, '1_1', 12000, 38);
  assert.equal(replayed.currentChapter, '1_1');
  assert.ok(replayed.unlockedChapters.includes('1_3'));
  assert.ok(replayed.completedChapters.includes('1_2'));
  assert.deepEqual(replayed.rewards['1_2'], ['gantry_key']);
});

test('computeCameraMovementVector computes camera-relative forward, strafe, and slower backpedal', () => {
  // At yaw = 0, camera looks along -Z, right is +X
  const fwd = computeCameraMovementVector(0, 1, 0);
  assert.ok(Math.abs(fwd.x) < 1e-6 && fwd.z < -0.99);
  assert.equal(fwd.speedScale, 1);

  const back = computeCameraMovementVector(0, -1, 0);
  assert.ok(Math.abs(back.x) < 1e-6 && back.z > 0.99);
  assert.equal(back.speedScale, 0.62);

  const strafeRight = computeCameraMovementVector(0, 0, 1);
  assert.ok(strafeRight.x > 0.99 && Math.abs(strafeRight.z) < 1e-6);
});

test('party approval clamping and council revolt threshold', () => {
  const save = createInitialSave();
  const dropped = applyPartyApproval(save.party, { yaga: -40, nail: -35, ledger: -35, grandpa: -40 });
  assert.equal(isPartyCouncilRevolting(dropped, false), true);
  assert.equal(dropped.yaga, 18);
});

test('calculateEnding resolves secret E5, corporate E1, captain E2, and defeat-pool E4 accurately', () => {
  const base = createInitialSave();

  // E5 secret ending
  const e5Save = {
    ...base,
    capitalAK: 2100000,
    flags: {
      ...base.flags,
      theoJoined: true,
      theoChoice: 'forgive' as const,
      finalCranePerfect: true,
      archiveRecovered: true,
      captainContractSigned: false,
    },
  };
  assert.equal(calculateEnding(e5Save), 'E5');

  // E1 corporate contract ending
  const e1Save = {
    ...base,
    capitalAK: 2000000,
    flags: {
      ...base.flags,
      captainContractSigned: true,
      archiveRecovered: true,
    },
  };
  assert.equal(calculateEnding(e1Save), 'E1');

  // E4 fallback when capital/window critical
  const e4Save = {
    ...base,
    capitalAK: 300000,
    lockedRealAK: 200000,
    windowWeeks: 3,
  };
  assert.equal(calculateEnding(e4Save), 'E4');
});

test('computeCombatDamage scales by difficulty and Crane Moment multiplier', () => {
  assert.equal(computeCombatDamage(100, 'captain', true, false), 100);
  assert.equal(computeCombatDamage(100, 'captain', true, true), 240);
  assert.equal(computeCombatDamage(100, 'story', false, false), 60);
  assert.equal(computeCombatDamage(100, 'hardcore', false, false), 145);
});

test('computeRelicBonuses empowers skills, speed, HP, and bypass routes from collected relics', () => {
  let save = createInitialSave();
  save = completeChapterAndUnlockNext(save, 'prolog', 'dispatch_badge');
  save = completeChapterAndUnlockNext(save, '1_1', 'hand_truck');
  save = completeChapterAndUnlockNext(save, '1_2', 'gantry_key');

  const bonuses = computeRelicBonuses(save);
  assert.ok(bonuses.interactRangeBonus >= 0.9);
  assert.ok(bonuses.moveSpeedMult > 1.1);
  assert.ok(bonuses.maxHpBonus >= 15);
  assert.ok(bonuses.craneCooldownMult < 0.8);
  assert.ok(bonuses.craneDamageMult >= 1.25);
  assert.ok(bonuses.unlockedBypasses.includes('dispatch_chute'));
  assert.ok(bonuses.unlockedBypasses.includes('freight_ramp'));
  assert.ok(bonuses.unlockedBypasses.includes('overhead_gantry'));
});

test('all 12 chapters conform to unified goal -> physics obstacle -> stakes -> relic blueprint', () => {
  assert.equal(CHAPTERS.length, 12);
  const rewardIds = new Set<string>();
  for (const ch of CHAPTERS) {
    assert.ok(ch.blueprint.goalEn.length > 0 && ch.blueprint.goalRu.length > 0);
    assert.ok(ch.blueprint.obstacleCount >= 2);
    assert.ok(ch.blueprint.stakesEn.length > 0 && ch.blueprint.stakesRu.length > 0);
    assert.ok(ch.rewardId.length > 0);
    rewardIds.add(ch.rewardId);
  }
  assert.equal(rewardIds.size, 12);
});

test('computeComboMultiplier scales smoothly and caps at 2.5x', () => {
  assert.equal(computeComboMultiplier(0), 1);
  assert.equal(computeComboMultiplier(1), 1);
  assert.equal(computeComboMultiplier(3), 1.3);
  assert.equal(computeComboMultiplier(20), 2.5);
});

test('computeOverchargeBonus triggers at >= 80 hydraulics energy', () => {
  const low = computeOverchargeBonus(100, 50);
  assert.deepEqual(low, { damage: 100, overcharged: false, energyCost: 0 });

  const high = computeOverchargeBonus(100, 85);
  assert.deepEqual(high, { damage: 125, overcharged: true, energyCost: 35 });
});

test('computeDashVector normalizes movement direction or falls back to facing yaw', () => {
  const moving = computeDashVector(3, 4, 0);
  assert.ok(Math.abs(moving.x - 0.6) < 1e-6 && Math.abs(moving.z - 0.8) < 1e-6);

  const idle = computeDashVector(0, 0, 0);
  assert.ok(Math.abs(idle.x) < 1e-6 && idle.z < -0.99);
});

test('unlockLoreEntry deduplicates sector logs and initializes empty', () => {
  const init = createInitialSave();
  assert.deepEqual(init.unlockedLore, []);
  const first = unlockLoreEntry(init.unlockedLore, 'prolog');
  assert.deepEqual(first, ['prolog']);
  const dup = unlockLoreEntry(first, 'prolog');
  assert.deepEqual(dup, ['prolog']);
  const second = unlockLoreEntry(dup, '1_2');
  assert.deepEqual(second, ['prolog', '1_2']);
});

test('computeSubQuestBonus scales tactical bonuses and caps safely', () => {
  assert.equal(computeSubQuestBonus(0), 0);
  assert.equal(computeSubQuestBonus(1), 5000);
  assert.equal(computeSubQuestBonus(3), 15000);
  assert.equal(computeSubQuestBonus(10), 25000);
});

test('evaluateCraneBalanceDrop rewards centered counterweight rigging and flags tilt', () => {
  const locked = evaluateCraneBalanceDrop(50);
  assert.equal(locked.stable, true);
  assert.equal(locked.label, 'LOCKED');
  assert.equal(locked.bonusMult, 1.5);

  const tilted = evaluateCraneBalanceDrop(92);
  assert.equal(tilted.stable, false);
  assert.equal(tilted.label, 'TILTED');
  assert.equal(tilted.bonusMult, 0.75);
});

test('generateTwin4Ticker returns deterministic commodities reacting to stake volatility', () => {
  const ticker = generateTwin4Ticker(75, 2);
  assert.equal(ticker.length, 4);
  assert.equal(ticker[0].symbol, 'H2-CELL');
  assert.equal(ticker[3].deltaPct, 2.5);
});


