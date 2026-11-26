import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type {
  CampaignSave,
  ChapterBlueprint,
  HudSnapshot,
  Keybindings,
  LanguageCode,
  RealWorldAlert,
  RelicBonuses,
} from '../game/types';
import {
  computeComboMultiplier,
  formatWindowWeeks,
  generateTwin4Ticker,
} from '../game/rules';
import {
  AttackSkillIcon,
  CraneSkillIcon,
  DashSkillIcon,
  GrappleSkillIcon,
  InteractSkillIcon,
  JumpSkillIcon,
  RelicPixelIcon,
  SlamSkillIcon,
} from './SvgIcons';
import { SECTOR_LORE_CODEX } from '../game/storyData';
import { soundEngine } from '../audio/soundEngine';

interface HudOverlayProps {
  ui: UiStrings;
  language: LanguageCode;
  save: CampaignSave;
  hud: HudSnapshot;
  chapterTitle: string;
  chapterBlueprint: ChapterBlueprint;
  relicBonuses: RelicBonuses;
  realWorldAlert: RealWorldAlert | null;
  onDismissRealWorldAlert: () => void;
  isTouch: boolean;
  keybindings: Keybindings;
  isFullscreen: boolean;
  muted: boolean;
  onAttack: () => void;
  onDash: () => void;
  onSkillCrane: () => void;
  onSkillGrapple: () => void;
  onSkillSlam: () => void;
  onInteract: () => void;
  onJump: () => void;
  onVirtualMove: (x: number, z: number) => void;
  onTouchOrbit: (dyaw: number, dpitch: number) => void;
  onOpenCommandDeck: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPC';
  if (code === 'Escape') return 'ESC';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHF';
  return code.slice(0, 4).toUpperCase();
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  ui,
  language,
  save,
  hud,
  chapterTitle,
  chapterBlueprint,
  relicBonuses,
  realWorldAlert,
  onDismissRealWorldAlert,
  isTouch,
  keybindings,
  isFullscreen,
  muted,
  onAttack,
  onDash,
  onSkillCrane,
  onSkillGrapple,
  onSkillSlam,
  onInteract,
  onJump,
  onVirtualMove,
  onTouchOrbit,
  onOpenCommandDeck,
  onOpenChapters,
  onOpenSettings,
  onPause,
  onToggleMute,
  onToggleFullscreen,
}) => {
  const [hoveredTip, setHoveredTip] = useState<{ title: string; desc: string } | null>(null);
  const [ghostHp, setGhostHp] = useState(hud.hp);
  const [tickerTick, setTickerTick] = useState(0);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const [stickKnob, setStickKnob] = useState({ x: 0, y: 0 });
  const touchOrbitLast = useRef<{ x: number; y: number } | null>(null);
  const isRu = language === 'ru' || language === 'uk';

  useEffect(() => {
    const t = window.setTimeout(() => setGhostHp(hud.hp), 240);
    return () => window.clearTimeout(t);
  }, [hud.hp]);

  // Live Twin-4 Futures ticker refresh every 3.5s
  useEffect(() => {
    const id = window.setInterval(() => setTickerTick((t) => t + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  const win = formatWindowWeeks(save.windowWeeks);
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / hud.maxHp) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / hud.maxEnergy) * 100));
  const lowHp = hpPct <= 30;
  const ownedRelics = relicBonuses.ownedRelics;
  const comboMult = computeComboMultiplier(hud.comboCount);
  const tickerItems = useMemo(
    () => generateTwin4Ticker(save.stakePercent, tickerTick),
    [save.stakePercent, tickerTick],
  );

  // Live SVG sparkline polyline points reacting to Stake % & tickerTick
  const stakeSparkline = useMemo(() => {
    const pts: string[] = [];
    const riskAmp = Math.max(2, save.stakePercent / 12);
    for (let i = 0; i < 9; i++) {
      const x = i * 7;
      const wave = Math.sin((tickerTick + i) * 1.15) * riskAmp;
      const y = Math.max(2, Math.min(14, 8 - wave));
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [save.stakePercent, tickerTick]);

  const handleStickMove = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, maxR);
    const nx = len > 0 ? (dx / len) * (clamped / maxR) : 0;
    const ny = len > 0 ? (dy / len) * (clamped / maxR) : 0;
    setStickKnob({ x: nx * maxR, y: ny * maxR });
    onVirtualMove(nx, ny);
  };

  const skillSlots = [
    {
      id: 'attack',
      key: formatKeyCode(keybindings.attack),
      title: ui.skillAttack,
      desc: ui.skillAttackDesc,
      cd: 0,
      icon: <AttackSkillIcon className="w-6 h-6" />,
      onClick: onAttack,
    },
    {
      id: 'crane',
      key: formatKeyCode(keybindings.skillCrane),
      title: ui.skillCrane,
      desc: ui.skillCraneDesc,
      cd: hud.craneCooldown,
      icon: <CraneSkillIcon className="w-6 h-6" />,
      onClick: onSkillCrane,
    },
    {
      id: 'grapple',
      key: formatKeyCode(keybindings.skillGrapple),
      title: ui.skillGrapple,
      desc: ui.skillGrappleDesc,
      cd: hud.grappleCooldown,
      icon: <GrappleSkillIcon className="w-6 h-6" />,
      onClick: onSkillGrapple,
    },
    {
      id: 'slam',
      key: formatKeyCode(keybindings.skillSlam),
      title: ui.skillSlam,
      desc: ui.skillSlamDesc,
      cd: hud.slamCooldown,
      icon: <SlamSkillIcon className="w-6 h-6" />,
      onClick: onSkillSlam,
    },
  ];

  const rigStability = hud.rigStability ?? 50;
  const rigInGreen = rigStability >= 28 && rigStability <= 72;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Peripheral critical HP vignette */}
      {lowHp && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{ boxShadow: 'inset 0 0 110px rgba(239, 68, 68, 0.55)' }}
        />
      )}

      {/* Touch Orbit Surface (active on mobile/tablet or touch detection) */}
      <div
        className={`fixed right-0 top-20 bottom-36 w-1/2 ${isTouch ? 'block' : 'md:hidden'} pointer-events-auto`}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) touchOrbitLast.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch || !touchOrbitLast.current) return;
          const dx = touch.clientX - touchOrbitLast.current.x;
          const dy = touch.clientY - touchOrbitLast.current.y;
          touchOrbitLast.current = { x: touch.clientX, y: touch.clientY };
          onTouchOrbit(dx * 0.008, dy * 0.006);
        }}
        onTouchEnd={() => {
          touchOrbitLast.current = null;
        }}
      />

      {/* Objective Waypoint Diamonds & Offscreen Edge Pointers */}
      {hud.objectiveMarkers.map((m) => {
        const isLore = m.markerKind === 'lore';
        const fillHex = isLore ? '#a78bfa' : m.isBypass ? '#ff6b1a' : '#a3e635';
        const dotClass = isLore
          ? 'bg-[#a78bfa]/85 border-[#ede9fe]'
          : m.isBypass
            ? 'bg-[#ff6b1a]/85 border-[#ffedd5]'
            : 'bg-[#a3e635]/80 border-[#ecfccb]';
        return (
          <div
            key={m.id}
            className="fixed pointer-events-none flex items-center justify-center"
            style={{
              left: `${m.x}px`,
              top: `${m.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {m.offscreen ? (
              <svg
                viewBox="0 0 16 16"
                className="w-5 h-5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                style={{ transform: `rotate(${m.angleRad}rad)` }}
                aria-hidden="true"
              >
                <polygon
                  points="2,2 14,8 2,14 5,8"
                  fill={fillHex}
                  stroke="#0b0d10"
                  strokeWidth="1.2"
                />
              </svg>
            ) : (
              <div className={`w-3.5 h-3.5 rotate-45 border-2 shadow-md ${dotClass}`} />
            )}
          </div>
        );
      })}

      {/* World-Space Enemy HP Bars & Windup Telegraph Alerts */}
      {hud.enemyBars.map((eb) => (
        <div
          key={eb.id}
          className="fixed pointer-events-none flex flex-col items-center gap-0.5"
          style={{
            left: `${eb.x}px`,
            top: `${eb.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {eb.windup && (
            <span className="font-display text-[10px] font-bold px-1 rounded bg-[#ef4444] text-white leading-tight animate-pulse">
              !
            </span>
          )}
          <div className={`w-12 h-1.5 rounded-xs overflow-hidden bg-black/85 border ${eb.windup ? 'border-[#ff6b1a]' : 'border-white/25'}`}>
            <div
              className={`h-full transition-all duration-75 ${eb.windup ? 'bg-[#ff6b1a]' : 'bg-[#ef4444]'}`}
              style={{ width: `${eb.hpPct}%` }}
            />
          </div>
        </div>
      ))}

      {/* Projected Floating Combat Text */}
      {hud.floatingTexts.map((ft) => (
        <div
          key={ft.id}
          className="fixed font-display font-bold text-base sm:text-lg hud-text-stroke pointer-events-none"
          style={{
            left: `${ft.x}px`,
            top: `${ft.y}px`,
            color: ft.color,
            opacity: Math.min(1, ft.life * 1.4),
            transform: 'translate(-50%, -50%)',
          }}
        >
          {ft.text}
        </div>
      ))}

      {/* Top-Left Industrial Telemetry Cluster */}
      <div className="fixed top-2.5 left-2.5 sm:top-4 sm:left-4 flex flex-col gap-1.5 w-[216px] sm:w-[336px] pointer-events-auto">
        <div className="iron-panel-subtle rounded-lg overflow-hidden">
          <div className="hazard-stripe-bar h-1 w-full" />
          <div className="px-2.5 py-2 sm:px-3.5 sm:py-2.5">
            <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-[#ff8c38] font-bold mb-1.5 truncate">
              <span className="truncate font-display">{chapterTitle}</span>
              {hud.comboCount >= 2 && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#84cc16]/15 border border-[#a3e635]/60 text-[10px] font-mono-num text-[#a3e635]">
                  {hud.comboCount} {ui.comboLabel} · {comboMult}x
                </span>
              )}
            </div>

            {/* 3-Column Spine Timer / Stake Sparkline / Phosphor Capital */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-2 text-[11px] sm:text-xs bg-[#090b0e] rounded p-1.5 border border-white/10">
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#848d99]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                  <span>{ui.windowLabel}</span>
                </div>
                <div className="font-mono-num font-bold text-[#ef4444]">
                  {win.months}{ui.monthsShort} {win.remWeeks}{ui.weeksShort}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#848d99]">{ui.stakeLabel}</div>
                <div className="flex items-center gap-1">
                  <span className="font-mono-num font-bold text-[#ff8c38]">{save.stakePercent}%</span>
                  <svg viewBox="0 0 56 16" className="hidden sm:block w-11 h-3.5 shrink-0" aria-hidden="true">
                    <polyline
                      fill="none"
                      stroke={save.stakePercent >= 40 ? '#ef4444' : '#ff6b1a'}
                      strokeWidth="1.6"
                      points={stakeSparkline}
                    />
                  </svg>
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#848d99]">{ui.capitalLabel}</div>
                <div className="font-mono-num font-bold terminal-phosphor truncate">
                  {save.capitalAK.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Integrity (HP) Bar */}
            <div className="mb-1.5">
              <div className="flex justify-between text-[10px] uppercase tracking-wider mb-0.5">
                <span className="text-[#848d99]">{ui.hpLabel}</span>
                <span className="font-mono-num text-[#d6dbe0]">
                  {hud.hp} / {hud.maxHp}
                </span>
              </div>
              <div className="relative h-2 bg-[#080a0d] rounded-xs overflow-hidden border border-[#848d99]/30">
                <div
                  className="absolute inset-y-0 left-0 bg-[#ff6b1a]/55 transition-all duration-300"
                  style={{ width: `${ghostPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#b91c1c] to-[#ef4444] transition-all duration-100"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            {/* Hydraulics Bar */}
            <div className="mb-1.5">
              <div className="flex justify-between text-[10px] uppercase tracking-wider mb-0.5">
                <span className={hud.overcharged ? 'text-[#a3e635] font-bold' : 'text-[#848d99]'}>
                  {ui.energyLabel} {hud.overcharged ? `· ${ui.overchargeLabel}` : ''}
                </span>
                <span className="font-mono-num text-[#a3e635]">
                  {hud.energy} / {hud.maxEnergy}
                </span>
              </div>
              <div className="relative h-1.5 bg-[#080a0d] rounded-xs overflow-hidden border border-[#84cc16]/30">
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                    hud.overcharged
                      ? 'bg-gradient-to-r from-[#84cc16] to-[#ff6b1a]'
                      : 'bg-gradient-to-r from-[#4d7c0f] to-[#a3e635]'
                  }`}
                  style={{ width: `${energyPct}%` }}
                />
              </div>
            </div>

            {/* Live Engineering Hoist Counterweight Gauge (Prologue / Crane Ready) */}
            {hud.rigTargetActive && (
              <div className="mb-1.5 pt-1 border-t border-white/10" title={ui.rigBalanceDesc}>
                <div className="flex items-center justify-between text-[9px] uppercase tracking-wider mb-0.5">
                  <span className="text-[#848d99] truncate">{ui.rigBalanceTitle}</span>
                  <span className={`font-mono-num font-bold ${rigInGreen ? 'text-[#a3e635]' : 'text-[#ff6b1a]'}`}>
                    {rigStability}% {rigInGreen ? 'LOCK' : 'SLIP'}
                  </span>
                </div>
                <div className="relative h-2 bg-[#080a0d] rounded-xs border border-[#49525e] overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-[#84cc16]/25 border-x border-[#a3e635]/65"
                    style={{ left: '28%', width: '44%' }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-1.5 -translate-x-1/2 ${
                      rigInGreen ? 'bg-[#a3e635]' : 'bg-[#ff6b1a]'
                    }`}
                    style={{ left: `${rigStability}%` }}
                  />
                </div>
              </div>
            )}

            {/* Contracts / Lore / Hostiles */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-[#d6dbe0] pt-1 border-t border-white/10">
              <span className="shrink-0">
                {ui.objectivesLabel}:{' '}
                <strong className="font-mono-num text-[#a3e635]">
                  {hud.objectivesDone}/{hud.objectivesTotal}
                </strong>
              </span>
              <span className="shrink-0 font-mono-num text-[10px] text-[#a78bfa]">
                LOG {(save.unlockedLore?.length ?? 0)}/12
              </span>
              <span className="shrink-0">
                {ui.enemiesLabel}:{' '}
                <strong className="font-mono-num text-[#ff8c38]">{hud.enemiesRemaining}</strong>
              </span>
            </div>

            <div className="mt-1 pt-1 border-t border-white/5 text-[10px] leading-snug space-y-0.5">
              <div className="line-clamp-2 text-[#cbd5e1]">
                {isRu ? chapterBlueprint.goalRu : chapterBlueprint.goalEn}
              </div>
              <div className="line-clamp-2 text-[#ff6b1a] font-medium">
                {ui.obstacleWarningLabel}: {isRu ? chapterBlueprint.obstacleRu : chapterBlueprint.obstacleEn}
              </div>
            </div>

            {ownedRelics.length > 0 && (
              <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center gap-1">
                {ownedRelics.slice(0, 5).map((rId) => (
                  <RelicPixelIcon key={rId} relicId={rId} className="w-4 h-4 shrink-0" />
                ))}
                {ownedRelics.length > 5 && (
                  <span className="text-[10px] font-mono-num text-[#ff8c38]">+{ownedRelics.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-Center Live Twin-4 Futures Ticker (Desktop / Tablet, Proposal #4) */}
      <div
        data-testid="twin4-ticker"
        className="hidden lg:flex fixed top-4 left-1/2 -translate-x-1/2 w-[380px] xl:w-[440px] iron-panel-subtle rounded-md px-2.5 py-1 items-center gap-2 overflow-hidden pointer-events-none"
      >
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#ff6b1a]/20 border border-[#ff6b1a]/50 text-[9px] font-mono-num font-bold text-[#ff8c38]">
          {ui.tickerLabel}
        </span>
        <div className="flex-1 overflow-hidden text-[10px] font-mono-num">
          <div className="animate-ticker gap-4">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`${item.symbol}_${idx}`} className="inline-flex items-center gap-1 pr-3">
                <span className="text-[#848d99]">{item.symbol}</span>
                <span className="text-[#d6dbe0]">{item.price}</span>
                <span className={item.deltaPct >= 0 ? 'text-[#a3e635]' : 'text-[#ef4444]'}>
                  {item.deltaPct >= 0 ? `+${item.deltaPct}%` : `${item.deltaPct}%`}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top-Right Compact Utility Icons */}
      <div className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playUiClick();
            onOpenCommandDeck();
          }}
          className="iron-btn rounded-lg p-2 sm:px-3 sm:py-2 text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          title={ui.commandDeck}
          aria-label={ui.commandDeck}
        >
          <Anchor className="w-4 h-4 text-[#ff6b1a]" />
          <span className="hidden md:inline">{ui.commandDeck}</span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playUiClick();
            onOpenChapters();
          }}
          aria-label={ui.chapterSelect}
          title={ui.chapterSelect}
          className="iron-btn rounded-lg p-2 shrink-0"
        >
          <Layers className="w-4 h-4 text-[#ff6b1a]" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="iron-btn rounded-lg p-2 shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4 text-[#ef4444]" /> : <Volume2 className="w-4 h-4 text-[#a3e635]" />}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playUiClick();
            onOpenSettings();
          }}
          aria-label={ui.settings}
          title={ui.settings}
          className="iron-btn rounded-lg p-2 shrink-0"
        >
          <Settings className="w-4 h-4 text-[#ff6b1a]" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playUiClick(true);
            onToggleFullscreen();
          }}
          aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
          title={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
          className="iron-btn rounded-lg p-2 shrink-0"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#ff6b1a]" /> : <Maximize2 className="w-4 h-4 text-[#ff6b1a]" />}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playUiClick();
            onPause();
          }}
          aria-label="Pause"
          title="Pause [Esc]"
          className="iron-btn rounded-lg p-2 shrink-0"
        >
          <Pause className="w-4 h-4 text-[#ff8c38]" />
        </button>
      </div>

      {/* Real-World Phone Push Notification Toast (Non-blocking clinic / insurance / crew alert) */}
      {realWorldAlert && (
        <div
          data-testid="real-world-alert"
          className="fixed bottom-[140px] left-2.5 right-2.5 sm:left-auto sm:bottom-20 sm:right-4 sm:w-76 iron-panel rounded-lg p-2.5 sm:p-3 border border-[#ff6b1a]/65 shadow-xl pointer-events-auto z-20"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono-num font-bold uppercase tracking-wider text-[#ff8c38]">
              <Smartphone className="w-3 h-3 text-[#ff6b1a]" />
              {ui.realPhoneTag}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onDismissRealWorldAlert}
              aria-label={ui.close}
              className="text-[#848d99] hover:text-[#d6dbe0] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="font-display text-[11px] font-bold text-[#a3e635] truncate mb-0.5">
            {isRu ? realWorldAlert.senderRu : realWorldAlert.senderEn}
          </div>
          <div className="text-[10px] sm:text-[11px] leading-snug text-[#d6dbe0]">
            {isRu ? realWorldAlert.bodyRu : realWorldAlert.bodyEn}
          </div>
        </div>
      )}

      {/* Non-blocking Black-Box Lore Banner & Tactical Sub-Quest Notification */}
      {(hud.loreToast || hud.subQuestHint) && (
        <div className="fixed top-16 sm:top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-md w-[90vw] pointer-events-none z-20">
          {hud.subQuestHint && (
            <div className="px-3 py-1 rounded-md bg-[#111418]/95 border border-[#ff6b1a]/70 text-[11px] font-display font-bold tracking-wider text-[#ff8c38] shadow-lg">
              {ui.subQuestLabel}: {hud.subQuestHint}
            </div>
          )}
          {hud.loreToast && (() => {
            const matched = isRu
              ? Object.values(SECTOR_LORE_CODEX).find((e) => hud.loreToast!.title.startsWith(e.code))
              : undefined;
            const toastTitle = matched ? `${matched.code} · ${matched.titleRu}` : hud.loreToast.title;
            const toastBody = matched ? matched.bodyRu : hud.loreToast.text;
            return (
              <div className="iron-panel rounded-lg px-4 py-2.5 border border-[#a78bfa]/65 shadow-xl text-left w-full">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] mb-0.5">
                  {ui.loreUnlockedTag}
                </div>
                <div className="font-display text-xs font-bold text-[#ff8c38] mb-1">{toastTitle}</div>
                <div className="text-[11px] leading-snug text-[#cbd5e1]">{toastBody}</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Proximity Interact Prompt */}
      {hud.nearInteractable && (
        <div className="fixed bottom-32 md:bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onInteract}
            className="gold-btn rounded-lg px-4 py-2 text-xs font-display font-bold tracking-wider uppercase whitespace-nowrap flex items-center gap-2"
          >
            {hud.nearIsBypass && (
              <span className="px-1.5 py-0.5 rounded bg-[#0b0d10] text-[#a3e635] text-[10px]">
                {ui.bypassReadyTag}
              </span>
            )}
            {hud.nearIsLore && (
              <span className="px-1.5 py-0.5 rounded bg-[#0b0d10] text-[#a78bfa] text-[10px]">
                LORE
              </span>
            )}
            <span>
              {hud.nearInteractable} · {isTouch ? ui.touchInteractPrompt : ui.interactPrompt}
            </span>
          </button>
        </div>
      )}

      {/* Skill Hover Tooltip (Desktop) */}
      {hoveredTip && !isTouch && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-72 iron-panel rounded-lg px-3.5 py-2.5 text-left pointer-events-none">
          <div className="font-display text-xs font-bold text-[#ff8c38] mb-0.5">{hoveredTip.title}</div>
          <div className="text-[11px] leading-snug text-[#d6dbe0]">{hoveredTip.desc}</div>
        </div>
      )}

      {/* Touch Ergonomic Right-Hand Cluster (Strike, 3 Skills, Dash, Interact & Jump; shown on Touch or mobile width) */}
      <div
        data-testid="touch-action-cluster"
        className={`fixed bottom-3 right-3 ${isTouch ? 'flex' : 'flex md:hidden'} flex-col items-end gap-2 pointer-events-auto`}
      >
        <div className="flex items-center gap-1.5">
          {skillSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              tabIndex={-1}
              onTouchStart={(e) => {
                e.preventDefault();
                slot.onClick();
              }}
              onClick={slot.onClick}
              aria-label={slot.title}
              className="relative w-11 h-11 rounded-lg crane-switch-btn flex items-center justify-center shrink-0"
            >
              <span
                className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${
                  slot.cd > 0 ? 'bg-[#ef4444]' : 'bg-[#a3e635]'
                }`}
              />
              {slot.icon}
              {slot.cd > 0 && (
                <span className="absolute inset-0 rounded-lg bg-black/80 flex items-center justify-center font-mono-num text-xs font-bold text-[#ff8c38]">
                  {slot.cd.toFixed(1)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            onTouchStart={(e) => {
              e.preventDefault();
              onDash();
            }}
            onClick={onDash}
            aria-label={ui.skillDash}
            className="relative w-12 h-12 rounded-lg crane-switch-btn flex items-center justify-center shrink-0"
          >
            <DashSkillIcon className="w-6 h-6" />
            {hud.dashCooldown > 0 && (
              <span className="absolute inset-0 rounded-lg bg-black/80 flex items-center justify-center font-mono-num text-xs font-bold text-[#a3e635]">
                {hud.dashCooldown.toFixed(1)}
              </span>
            )}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onTouchStart={(e) => {
              e.preventDefault();
              onInteract();
            }}
            onClick={onInteract}
            aria-label={ui.skillInteract}
            className={`w-13 h-13 rounded-xl flex items-center justify-center border transition-colors ${
              hud.nearInteractable
                ? 'gold-btn border-[#ffedd5]'
                : 'crane-switch-btn border-[#a3e635]/60'
            }`}
          >
            <InteractSkillIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onTouchStart={(e) => {
              e.preventDefault();
              onJump();
            }}
            onClick={onJump}
            aria-label={ui.skillJump}
            className="w-13 h-13 rounded-xl crane-switch-btn border-[#ff6b1a]/65 flex items-center justify-center"
          >
            <JumpSkillIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Desktop Heavy Physical Crane-Console Switch Deck */}
      {!isTouch && (
        <div
          data-testid="desktop-action-bar"
          className="hidden md:flex fixed bottom-3.5 left-1/2 -translate-x-1/2 iron-panel rounded-xl overflow-hidden flex-col pointer-events-auto"
        >
          <div className="px-3 py-2 flex items-center gap-2">
            {[
              ...skillSlots,
              {
                id: 'dash',
                key: formatKeyCode(keybindings.dash),
                title: ui.skillDash,
                desc: ui.skillDashDesc,
                cd: hud.dashCooldown,
                icon: <DashSkillIcon />,
                onClick: onDash,
              },
              {
                id: 'interact',
                key: formatKeyCode(keybindings.interact),
                title: ui.skillInteract,
                desc: ui.skillInteractDesc,
                cd: 0,
                icon: <InteractSkillIcon />,
                onClick: onInteract,
              },
              {
                id: 'jump',
                key: formatKeyCode(keybindings.jump),
                title: ui.skillJump,
                desc: ui.skillJumpDesc,
                cd: 0,
                icon: <JumpSkillIcon />,
                onClick: onJump,
              },
            ].map((slot) => (
              <button
                key={slot.id}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  slot.onClick();
                }}
                onMouseEnter={() => setHoveredTip({ title: slot.title, desc: slot.desc })}
                onMouseLeave={() => setHoveredTip(null)}
                aria-label={slot.title}
                className="relative w-12 h-12 rounded-md crane-switch-btn flex items-center justify-center shrink-0"
              >
                <span
                  className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${
                    slot.cd > 0 ? 'bg-[#ef4444]' : 'bg-[#a3e635]'
                  }`}
                />
                {slot.icon}
                <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded bg-[#0b0d10] border border-[#ff6b1a]/70 text-[9px] font-mono-num text-[#ff8c38]">
                  {slot.key}
                </span>
                {slot.cd > 0 && (
                  <span className="absolute inset-0 rounded-md bg-black/80 flex items-center justify-center font-mono-num text-xs font-bold text-[#ff8c38]">
                    {slot.cd.toFixed(1)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="hazard-stripe-bar h-1 w-full" />
        </div>
      )}

      {/* Virtual Thumbstick (bottom-left; auto-activated on touch or mobile screens) */}
      <div
        ref={stickRef}
        data-testid="touch-virtual-stick"
        className={`fixed bottom-4 left-4 w-24 h-24 rounded-full iron-panel-subtle items-center justify-center ${
          isTouch ? 'flex' : 'flex md:hidden'
        } pointer-events-auto touch-none border border-[#ff6b1a]/45`}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handleStickMove(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleStickMove(t.clientX, t.clientY);
        }}
        onTouchEnd={() => {
          setStickKnob({ x: 0, y: 0 });
          onVirtualMove(0, 0);
        }}
      >
        <div className="w-10 h-10 rounded-full border border-[#ff6b1a]/30 pointer-events-none" />
        <div
          className="absolute w-9 h-9 rounded-full bg-[#ff6b1a] border border-[#ffedd5] shadow-lg pointer-events-none"
          style={{ transform: `translate(${stickKnob.x}px, ${stickKnob.y}px)` }}
        />
      </div>
    </div>
  );
};
