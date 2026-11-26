export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elv'
  | 'orc';

export type DifficultyLevel = 'story' | 'captain' | 'hardcore';
export type GraphicsQuality = 'low' | 'balanced' | 'high' | 'cinematic';
export type GameModeState = 'title' | 'playing' | 'paused' | 'gameover';

export type ChapterId =
  | 'prolog'
  | '1_1'
  | '1_2'
  | '1_3'
  | '2_1'
  | '2_2'
  | '2_3'
  | '3_1'
  | '3_2'
  | '3_3'
  | '4_1'
  | '4_2';

export type ArenaTheme =
  | 'basement'
  | 'port_gravel'
  | 'ring_masts'
  | 'abyssal_archive'
  | 'zero_mooring';

export type PartyMemberId = 'yaga' | 'nail' | 'ledger' | 'grandpa' | 'theo';

export type AlmanacId =
  | 'crane_moment'
  | 'osmosis'
  | 'sleeping_cargo'
  | 'reverse_auction'
  | 'dry_dock'
  | 'gene_guarantors';

export type EndingId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5';

export type KeybindAction =
  | 'moveForward'
  | 'moveBackward'
  | 'strafeLeft'
  | 'strafeRight'
  | 'jump'
  | 'attack'
  | 'dash'
  | 'skillCrane'
  | 'skillGrapple'
  | 'skillSlam'
  | 'interact'
  | 'pause';

export type Keybindings = Record<KeybindAction, string>;

export interface PartyState {
  yaga: number;
  nail: number;
  ledger: number;
  grandpa: number;
  theo: number;
}

export interface CampaignFlags {
  ratsChoice?: 'guild' | 'bribe' | 'trap';
  act1DebtPath?: 'debt' | 'scheme' | 'people';
  nailCousinSaved?: boolean;
  theoChoice?: 'kick' | 'blackmail' | 'forgive';
  theoJoined: boolean;
  archiveRecovered: boolean;
  gatewayFrozen: boolean;
  captainContractSigned: boolean;
  finalCranePerfect: boolean;
  yagaUltimatumTriggered: boolean;
  grandpaShipyardUpgraded: boolean;
}

export interface AuctionLot {
  id: string;
  titleEn: string;
  titleRu: string;
  category: 'salvage' | 'license' | 'cargo' | 'archive';
  buyPrice: number;
  estimatedValue: number;
  riskPercent: number;
  expiresInSec: number;
  sold?: boolean;
}

export interface GameSettings {
  language: LanguageCode;
  difficulty: DifficultyLevel;
  graphics: GraphicsQuality;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  rmbJumpTap: boolean;
  crtScanlines: boolean;
  keybindings: Keybindings;
}

export interface CampaignSave {
  version: number;
  currentChapter: ChapterId;
  unlockedChapters: ChapterId[];
  completedChapters: ChapterId[];
  rewards: Record<string, string[]>;
  capitalAK: number;
  lockedRealAK: number;
  surgeryTargetAK: number;
  windowWeeks: number; // 40 weeks = 10 months
  stakePercent: number;
  fatigue: number;
  party: PartyState;
  unlockedAlmanac: AlmanacId[];
  unlockedLore?: ChapterId[];
  hospitalPrologueSeen?: boolean;
  flags: CampaignFlags;
  bestScore: number;
}

export interface RealWorldAlert {
  id: string;
  senderEn: string;
  senderRu: string;
  bodyEn: string;
  bodyRu: string;
  kind: 'clinic' | 'insurance' | 'crew';
}

export interface MarketTickerItem {
  symbol: string;
  price: number;
  deltaPct: number;
}

export interface SectorLoreEntry {
  chapterId: ChapterId;
  code: string;
  titleEn: string;
  titleRu: string;
  sourceEn: string;
  sourceRu: string;
  bodyEn: string;
  bodyRu: string;
  crewMember: PartyMemberId;
}

export interface DialogueChoice {
  id: string;
  labelEn: string;
  labelRu: string;
  hintEn?: string;
  hintRu?: string;
  capitalDelta?: number;
  lockedDelta?: number;
  windowWeeksDelta?: number;
  stakeDelta?: number;
  partyDeltas?: Partial<PartyState>;
  unlockAlmanac?: AlmanacId;
  setFlags?: Partial<CampaignFlags>;
  nextNodeId?: string;
  completesChapter?: boolean;
  triggersEnding?: boolean;
  requiresFlag?: keyof CampaignFlags;
  minCapital?: number;
}

export interface DialogueNode {
  id: string;
  speakerId: 'narrator' | 'artem' | 'yaga' | 'nail' | 'ledger' | 'grandpa' | 'theo' | 'stremya' | 'myakish' | 'stern' | 'duty';
  speakerNameEn: string;
  speakerNameRu: string;
  locationEn: string;
  locationRu: string;
  isRealWorld?: boolean;
  textEn: string;
  textRu: string;
  choices: DialogueChoice[];
}

export type ObstacleKind = 'steam_vent' | 'swinging_beam' | 'moving_press' | 'laser_cordon';

export interface ChapterBlueprint {
  goalEn: string;
  goalRu: string;
  obstacleKind: ObstacleKind;
  obstacleCount: number;
  obstacleSpeed: number;
  obstacleEn: string;
  obstacleRu: string;
  stakesEn: string;
  stakesRu: string;
  bypassRelicId?: string;
}

export interface RelicBonuses {
  moveSpeedMult: number;
  maxHpBonus: number;
  craneCooldownMult: number;
  craneDamageMult: number;
  craneRadiusBonus: number;
  grappleCooldownMult: number;
  slamCooldownMult: number;
  interactRangeBonus: number;
  bonusAkMult: number;
  unlockedBypasses: string[];
  ownedRelics: string[];
}

export interface ChapterDefinition {
  id: ChapterId;
  actNumber: 0 | 1 | 2 | 3 | 4;
  orderIndex: number;
  titleEn: string;
  titleRu: string;
  subtitleEn: string;
  subtitleRu: string;
  arenaTheme: ArenaTheme;
  rewardId: string;
  rewardLabelEn: string;
  rewardLabelRu: string;
  rewardEffectEn: string;
  rewardEffectRu: string;
  blueprint: ChapterBlueprint;
  entryCapitalMin: number;
  entryWindowWeeks: number;
  objectiveCount: number;
  enemyWaves: number;
  introDialogueId: string;
  outroDialogueId: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  objectivesDone: number;
  objectivesTotal: number;
  enemiesRemaining: number;
  score: number;
  comboCount: number;
  overcharged: boolean;
  craneCooldown: number;
  grappleCooldown: number;
  slamCooldown: number;
  dashCooldown: number;
  nearInteractable: string | null;
  nearIsBypass: boolean;
  nearIsLore?: boolean;
  activeTip: string | null;
  loreToast: { title: string; text: string } | null;
  subQuestHint: string | null;
  rigStability?: number | null;
  rigTargetActive?: boolean;
  enemyBars: Array<{
    id: number;
    x: number;
    y: number;
    hpPct: number;
    windup: boolean;
  }>;
  objectiveMarkers: Array<{
    id: string;
    x: number;
    y: number;
    isBypass: boolean;
    markerKind?: 'contract' | 'bypass' | 'lore';
    offscreen: boolean;
    angleRad: number;
  }>;
  floatingTexts: Array<{
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
    life: number;
  }>;
}
