import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyPartyApproval,
  applyReinvestOrLock,
  calculateEnding,
  completeChapterAndUnlockNext,
  computeRelicBonuses,
  createInitialSave,
  DEFAULT_KEYBINDINGS,
  startSelectedChapterSave,
  unlockAlmanacEntry,
  unlockLoreEntry,
  updateFlags,
} from './game/rules';
import { getUi, isRtlLanguage } from './game/i18n';
import { CHAPTERS, DIALOGUES, INITIAL_AUCTION_LOTS, REAL_WORLD_ALERTS } from './game/storyData';
import type {
  AuctionLot,
  CampaignSave,
  ChapterId,
  DialogueChoice,
  EndingId,
  GameModeState,
  GameSettings,
  HudSnapshot,
  LanguageCode,
  RealWorldAlert,
  RelicBonuses,
} from './game/types';
import { soundEngine } from './audio/soundEngine';
import { IronCaptainScene } from './three/IronCaptainScene';
import { TitleScreen } from './components/TitleScreen';
import { HudOverlay } from './components/HudOverlay';
import { DialogueOverlay } from './components/DialogueOverlay';
import { ChapterSelectModal } from './components/ChapterSelectModal';
import { CommandDeckModal } from './components/CommandDeckModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal, PauseModal } from './components/PauseAndEndingModals';
import { HospitalPrologueModal } from './components/HospitalPrologueModal';

const SAVE_KEY = 'iron_captain_save_v1';
const SETTINGS_KEY = 'iron_captain_settings_v1';

function loadSavedCampaign(): CampaignSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CampaignSave;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.unlockedChapters)) {
        return {
          ...parsed,
          unlockedLore: Array.isArray(parsed.unlockedLore) ? parsed.unlockedLore : [],
        };
      }
    }
  } catch {
    // Ignore corrupt storage
  }
  return createInitialSave();
}

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        language: parsed.language ?? 'en',
        difficulty: parsed.difficulty ?? 'captain',
        graphics: parsed.graphics ?? 'high',
        musicVolume: parsed.musicVolume ?? 0.45,
        sfxVolume: parsed.sfxVolume ?? 0.65,
        ambientVolume: parsed.ambientVolume ?? 0.35,
        rmbJumpTap: parsed.rmbJumpTap ?? true,
        crtScanlines: parsed.crtScanlines ?? true,
        keybindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings ?? {}) },
      };
    }
  } catch {
    // Ignore corrupt storage
  }
  return {
    language: 'en',
    difficulty: 'captain',
    graphics: 'high',
    musicVolume: 0.45,
    sfxVolume: 0.65,
    ambientVolume: 0.35,
    rmbJumpTap: true,
    crtScanlines: true,
    keybindings: { ...DEFAULT_KEYBINDINGS },
  };
}

const INITIAL_HUD: HudSnapshot = {
  hp: 100,
  maxHp: 100,
  energy: 100,
  maxEnergy: 100,
  objectivesDone: 0,
  objectivesTotal: 3,
  enemiesRemaining: 3,
  score: 0,
  comboCount: 0,
  overcharged: true,
  craneCooldown: 0,
  grappleCooldown: 0,
  slamCooldown: 0,
  dashCooldown: 0,
  nearInteractable: null,
  nearIsBypass: false,
  nearIsLore: false,
  activeTip: null,
  loreToast: null,
  subQuestHint: null,
  enemyBars: [],
  objectiveMarkers: [],
  floatingTexts: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<IronCaptainScene | null>(null);

  const [save, setSave] = useState<CampaignSave>(() => loadSavedCampaign());
  const [settings, setSettings] = useState<GameSettings>(() => loadSavedSettings());
  const [mode, setMode] = useState<GameModeState>('title');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [lots, setLots] = useState<AuctionLot[]>(() => INITIAL_AUCTION_LOTS);

  const [activeDialogueId, setActiveDialogueId] = useState<string | null>(null);
  const [showHospitalPrologue, setShowHospitalPrologue] = useState(false);
  const [realWorldAlert, setRealWorldAlert] = useState<RealWorldAlert | null>(null);
  const alertIndexRef = useRef(0);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandDeck, setShowCommandDeck] = useState(false);
  const [endingOutcome, setEndingOutcome] = useState<{ type: 'defeat' | 'ending'; endingId?: EndingId } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isTouch, setIsTouch] = useState<boolean>(() =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches),
  );

  const ui = useMemo(() => getUi(settings.language), [settings.language]);
  const isRu = settings.language === 'ru' || settings.language === 'uk';
  const relicBonuses = useMemo(() => computeRelicBonuses(save), [save]);

  const currentChapterDef = useMemo(
    () => CHAPTERS.find((c) => c.id === save.currentChapter) ?? CHAPTERS[0],
    [save.currentChapter],
  );

  // Refs for stable Three.js callbacks
  const chapterDefRef = useRef(currentChapterDef);
  chapterDefRef.current = currentChapterDef;
  const saveRef = useRef(save);
  saveRef.current = save;

  // Persist save & settings
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // Ignore storage quota issues
    }
  }, [save]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
    document.documentElement.dir = isRtlLanguage(settings.language) ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    soundEngine.setVolumes(settings.musicVolume, settings.sfxVolume, settings.ambientVolume);
    sceneRef.current?.applyGraphicsQuality(settings.graphics);
    sceneRef.current?.setDifficulty(settings.difficulty);
    sceneRef.current?.setKeybindings(settings.keybindings, settings.rmbJumpTap);
  }, [settings]);

  // Mirror state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = mode;
    if (sceneRef.current) {
      const effective3DMode: GameModeState =
        mode === 'playing' &&
        !showHospitalPrologue &&
        !activeDialogueId &&
        !showChapters &&
        !showSettings &&
        !showCommandDeck
          ? 'playing'
          : mode === 'title'
            ? 'title'
            : 'paused';
      sceneRef.current.setMode(effective3DMode);
    }
  }, [mode, showHospitalPrologue, activeDialogueId, showChapters, showSettings, showCommandDeck]);

  // Periodic Real-World Phone Push Notifications during active Hydrogen shifts
  useEffect(() => {
    if (mode !== 'playing' || showHospitalPrologue || activeDialogueId || REAL_WORLD_ALERTS.length === 0) {
      return;
    }
    const showNextAlert = () => {
      const alert = REAL_WORLD_ALERTS[alertIndexRef.current % REAL_WORLD_ALERTS.length];
      alertIndexRef.current += 1;
      setRealWorldAlert(alert);
    };
    const initialTimer = window.setTimeout(showNextAlert, 3500);
    const intervalTimer = window.setInterval(showNextAlert, 38000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, [mode, showHospitalPrologue, activeDialogueId]);

  // Auto-adapt to Touch controls on first screen tap
  useEffect(() => {
    const onFirstTouch = () => {
      setIsTouch(true);
    };
    window.addEventListener('touchstart', onFirstTouch, { passive: true });
    return () => window.removeEventListener('touchstart', onFirstTouch);
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const launchChapter = useCallback(
    (chapterId: ChapterId, skipIntroDialogue = false, bonusesOverride?: RelicBonuses) => {
      const def = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0];
      const bonuses = bonusesOverride ?? computeRelicBonuses(saveRef.current);
      setSave((prev) => startSelectedChapterSave(prev, def.id, def.entryCapitalMin, def.entryWindowWeeks));
      setEndingOutcome(null);
      setShowChapters(false);
      setShowCommandDeck(false);
      setShowSettings(false);
      setMode('playing');
      sceneRef.current?.loadArena(
        def.arenaTheme,
        def.objectiveCount,
        def.enemyWaves,
        bonuses,
        def.blueprint,
        def.id,
        saveRef.current.unlockedLore ?? [],
      );
      soundEngine.unlock();
      soundEngine.setMusicMood(def.arenaTheme);
      setActiveDialogueId(skipIntroDialogue ? null : def.introDialogueId);
    },
    [],
  );

  // Mount Three.js scene once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new IronCaptainScene(
      mount,
      settings.graphics,
      settings.difficulty,
      settings.keybindings,
      {
        onHudUpdate: (snap) => setHud(snap),
        onChapterObjectivesCleared: () => {
          const def = chapterDefRef.current;
          setActiveDialogueId(def.outroDialogueId);
        },
        onPlayerDefeated: () => {
          setEndingOutcome({ type: 'defeat' });
          setMode('gameover');
        },
        onPauseRequested: () => {
          setMode((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        },
        onInteractBonusAK: (ak) => {
          setSave((prev) => ({ ...prev, capitalAK: prev.capitalAK + ak }));
        },
        onLoreUnlocked: (chapterId, crewMember) => {
          setSave((prev) => ({
            ...prev,
            unlockedLore: unlockLoreEntry(prev.unlockedLore, chapterId),
            party: applyPartyApproval(prev.party, { [crewMember]: 4 }),
          }));
        },
      },
    );
    sceneRef.current = engine;

    // Support ?autostart=1 for automated inspection or direct boot
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      launchChapter(saveRef.current.currentChapter, true);
    }

    return () => {
      engine.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcuts (M mute, Esc close modals or resume from pause)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && document.activeElement?.tagName !== 'INPUT') {
        setMuted(soundEngine.toggleMute());
      } else if (e.code === 'Escape' && (showCommandDeck || showChapters || showSettings)) {
        e.preventDefault();
        setShowCommandDeck(false);
        setShowChapters(false);
        setShowSettings(false);
      } else if (
        (e.code === settings.keybindings.pause || e.code === 'KeyP') &&
        mode === 'paused' &&
        !showChapters &&
        !showSettings &&
        !showCommandDeck
      ) {
        e.preventDefault();
        setMode('playing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, settings.keybindings.pause, showChapters, showSettings, showCommandDeck]);

  const handleStartNew = useCallback(() => {
    const fresh = createInitialSave();
    setSave(fresh);
    setLots(INITIAL_AUCTION_LOTS);
    setRealWorldAlert(null);
    setShowHospitalPrologue(true);
  }, []);

  const handleEnterHydrogenFromPrologue = useCallback(
    (calibrationBonusAK: number) => {
      setShowHospitalPrologue(false);
      setSave((prev) => {
        const next: CampaignSave = {
          ...prev,
          hospitalPrologueSeen: true,
          capitalAK: prev.capitalAK + calibrationBonusAK,
        };
        launchChapter('prolog', false, computeRelicBonuses(next));
        return next;
      });
    },
    [launchChapter],
  );

  const handleContinue = useCallback(() => {
    if (!save.hospitalPrologueSeen && save.currentChapter === 'prolog' && save.completedChapters.length === 0) {
      setShowHospitalPrologue(true);
      return;
    }
    launchChapter(save.currentChapter, false);
  }, [launchChapter, save.completedChapters.length, save.currentChapter, save.hospitalPrologueSeen]);

  const handleDialogueChoice = useCallback(
    (choice: DialogueChoice) => {
      const def = currentChapterDef;
      let nextSave = {
        ...save,
        capitalAK: Math.max(0, save.capitalAK + (choice.capitalDelta ?? 0)),
        lockedRealAK: Math.max(0, save.lockedRealAK + (choice.lockedDelta ?? 0)),
        windowWeeks: Math.max(1, save.windowWeeks + (choice.windowWeeksDelta ?? 0)),
        stakePercent: Math.max(5, Math.min(100, save.stakePercent + (choice.stakeDelta ?? 0))),
        party: applyPartyApproval(save.party, choice.partyDeltas),
        unlockedAlmanac: unlockAlmanacEntry(save.unlockedAlmanac, choice.unlockAlmanac),
        flags: updateFlags(save.flags, choice.setFlags),
        bestScore: Math.max(save.bestScore, hud.score),
      };

      if (choice.completesChapter) {
        nextSave = completeChapterAndUnlockNext(nextSave, def.id, def.rewardId);
      }

      setSave(nextSave);

      if (choice.triggersEnding) {
        const endingId = calculateEnding(nextSave);
        setActiveDialogueId(null);
        setEndingOutcome({ type: 'ending', endingId });
        setMode('gameover');
        soundEngine.setMusicMood('victory');
        return;
      }

      if (choice.nextNodeId) {
        setActiveDialogueId(choice.nextNodeId);
        return;
      }

      if (choice.completesChapter) {
        const idx = CHAPTERS.findIndex((c) => c.id === def.id);
        const nextChapter = idx >= 0 && idx + 1 < CHAPTERS.length ? CHAPTERS[idx + 1] : null;
        if (nextChapter) {
          setActiveDialogueId(null);
          launchChapter(nextChapter.id, false, computeRelicBonuses(nextSave));
          return;
        }
      }

      // Close intro dialogue to start 3D arena action
      setActiveDialogueId(null);
    },
    [currentChapterDef, hud.score, launchChapter, save],
  );

  const handleTradeLot = useCallback(
    (lotId: string) => {
      const lot = lots.find((l) => l.id === lotId);
      if (!lot || lot.sold || save.capitalAK < lot.buyPrice) return;
      const profit = lot.estimatedValue - lot.buyPrice;
      setLots((prev) => prev.map((l) => (l.id === lotId ? { ...l, sold: true } : l)));
      setSave((prev) => ({
        ...prev,
        capitalAK: prev.capitalAK + profit,
        stakePercent: Math.min(100, prev.stakePercent + 3),
      }));
    },
    [lots, save.capitalAK],
  );

  const handleDualEconomy = useCallback((modeChoice: 'lock' | 'reinvest', amount: number) => {
    setSave((prev) => applyReinvestOrLock(prev, modeChoice, amount).save);
  }, []);

  const hasProgress = save.completedChapters.length > 0 || save.currentChapter !== 'prolog';
  const activeDialogueNode = activeDialogueId ? DIALOGUES[activeDialogueId] ?? null : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080b10]">
      {/* Isolated WebGL Mount (never unmounted by HUD re-renders) */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-mount"
        className="fixed inset-0 w-full h-full"
      />

      {/* Title Screen */}
      {mode === 'title' && (
        <TitleScreen
          ui={ui}
          language={settings.language}
          hasProgress={hasProgress}
          isTouch={isTouch}
          isFullscreen={isFullscreen}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
          onOpenChapters={() => setShowChapters(true)}
          onOpenSettings={() => setShowSettings(true)}
          onChangeLanguage={(lang: LanguageCode) => setSettings((prev) => ({ ...prev, language: lang }))}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Playing HUD */}
      {(mode === 'playing' || mode === 'paused') && (
        <HudOverlay
          ui={ui}
          language={settings.language}
          save={save}
          hud={hud}
          chapterTitle={isRu ? currentChapterDef.titleRu : currentChapterDef.titleEn}
          chapterBlueprint={currentChapterDef.blueprint}
          relicBonuses={relicBonuses}
          realWorldAlert={realWorldAlert}
          onDismissRealWorldAlert={() => setRealWorldAlert(null)}
          isTouch={isTouch}
          keybindings={settings.keybindings}
          isFullscreen={isFullscreen}
          muted={muted}
          onAttack={() => sceneRef.current?.triggerAttack()}
          onDash={() => sceneRef.current?.triggerDash()}
          onSkillCrane={() => sceneRef.current?.triggerCraneMoment()}
          onSkillGrapple={() => sceneRef.current?.triggerGrapple()}
          onSkillSlam={() => sceneRef.current?.triggerSlam()}
          onInteract={() => sceneRef.current?.triggerInteract()}
          onJump={() => sceneRef.current?.triggerJump()}
          onVirtualMove={(x, z) => sceneRef.current?.setVirtualMove(x, z)}
          onTouchOrbit={(dyaw, dpitch) => sceneRef.current?.orbitBy(dyaw, dpitch)}
          onOpenCommandDeck={() => setShowCommandDeck(true)}
          onOpenChapters={() => setShowChapters(true)}
          onOpenSettings={() => setShowSettings(true)}
          onPause={() => setMode((prev) => (prev === 'playing' ? 'paused' : 'playing'))}
          onToggleMute={() => setMuted(soundEngine.toggleMute())}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Interactive Hospital Corridor #4 Prologue */}
      {showHospitalPrologue && (
        <HospitalPrologueModal
          ui={ui}
          language={settings.language}
          onEnterHydrogen={handleEnterHydrogenFromPrologue}
        />
      )}

      {/* Story Dialogue & Decisions */}
      {mode === 'playing' && activeDialogueNode && (
        <DialogueOverlay
          ui={ui}
          language={settings.language}
          node={activeDialogueNode}
          capitalAK={save.capitalAK}
          onSelectChoice={handleDialogueChoice}
        />
      )}

      {/* Pause Modal */}
      {mode === 'paused' && !showChapters && !showSettings && !showCommandDeck && (
        <PauseModal
          ui={ui}
          onResume={() => setMode('playing')}
          onOpenCommandDeck={() => setShowCommandDeck(true)}
          onOpenChapters={() => setShowChapters(true)}
          onOpenSettings={() => setShowSettings(true)}
          onRestartChapter={() => launchChapter(save.currentChapter, false)}
          onReturnToTitle={() => {
            setActiveDialogueId(null);
            setMode('title');
            soundEngine.setMusicMood('title');
          }}
        />
      )}

      {/* Chapter Select Modal */}
      {showChapters && (
        <ChapterSelectModal
          ui={ui}
          language={settings.language}
          save={save}
          inActiveGameplay={mode === 'playing' || mode === 'paused'}
          onSelectChapter={(chId) => launchChapter(chId, false)}
          onClose={() => setShowChapters(false)}
        />
      )}

      {/* Polina L. Command Deck (Party / Almanac / Market) */}
      {showCommandDeck && (
        <CommandDeckModal
          ui={ui}
          language={settings.language}
          save={save}
          lots={lots}
          onTradeLot={handleTradeLot}
          onDualEconomyAction={handleDualEconomy}
          onClose={() => setShowCommandDeck(false)}
        />
      )}

      {/* Settings & Keybindings Modal */}
      {showSettings && (
        <SettingsModal
          ui={ui}
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Defeat or Campaign Ending Modal */}
      {mode === 'gameover' && endingOutcome && (
        <GameOverModal
          ui={ui}
          language={settings.language}
          outcome={endingOutcome.type}
          endingId={endingOutcome.endingId}
          save={save}
          score={hud.score}
          onRetry={() => {
            if (endingOutcome.type === 'ending') {
              handleStartNew();
            } else {
              launchChapter(save.currentChapter, true);
            }
          }}
          onReturnToTitle={() => {
            setEndingOutcome(null);
            setMode('title');
            soundEngine.setMusicMood('title');
          }}
        />
      )}
      {/* Optional Dendy CRT Scanlines & Vignette */}
      {settings.crtScanlines && (
        <div
          data-testid="crt-scanline-overlay"
          className="fixed inset-0 z-50 pointer-events-none crt-scanlines"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
