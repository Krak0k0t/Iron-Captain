import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type UiStrings } from '../game/i18n';
import type {
  DifficultyLevel,
  GameSettings,
  GraphicsQuality,
  KeybindAction,
  LanguageCode,
} from '../game/types';
import { DEFAULT_KEYBINDINGS } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  ui: UiStrings;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

const KEYBIND_LABELS: Array<{ action: KeybindAction; labelEn: string; labelRu: string }> = [
  { action: 'moveForward', labelEn: 'Move Forward', labelRu: 'Вперёд' },
  { action: 'moveBackward', labelEn: 'Backpedal', labelRu: 'Назад' },
  { action: 'strafeLeft', labelEn: 'Strafe Left', labelRu: 'Стрейф влево' },
  { action: 'strafeRight', labelEn: 'Strafe Right', labelRu: 'Стрейф вправо' },
  { action: 'jump', labelEn: 'Jump', labelRu: 'Прыжок' },
  { action: 'attack', labelEn: 'Gauntlet Strike', labelRu: 'Удар перчаткой' },
  { action: 'dash', labelEn: 'Hydraulic Dash', labelRu: 'Гидро-рывок' },
  { action: 'skillCrane', labelEn: 'Crane Moment', labelRu: 'Кран-момент' },
  { action: 'skillGrapple', labelEn: 'Cargo Sling', labelRu: 'Стропа' },
  { action: 'skillSlam', labelEn: 'Counterweight', labelRu: 'Противовес' },
  { action: 'interact', labelEn: 'Interact', labelRu: 'Действие' },
  { action: 'pause', labelEn: 'Pause', labelRu: 'Пауза' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  ui,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [listeningAction, setListeningAction] = useState<KeybindAction | null>(null);
  const isRu = settings.language === 'ru' || settings.language === 'uk';

  useEffect(() => {
    if (!listeningAction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      soundEngine.playUiClick(true);
      onUpdateSettings({
        ...settings,
        keybindings: {
          ...settings.keybindings,
          [listeningAction]: e.code,
        },
      });
      setListeningAction(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listeningAction, settings, onUpdateSettings]);

  const difficulties: Array<{ id: DifficultyLevel; label: string }> = [
    { id: 'story', label: ui.diffStory },
    { id: 'captain', label: ui.diffCaptain },
    { id: 'hardcore', label: ui.diffHardcore },
  ];

  const graphicsLevels: Array<{ id: GraphicsQuality; label: string }> = [
    { id: 'low', label: ui.gfxLow },
    { id: 'balanced', label: ui.gfxBalanced },
    { id: 'high', label: ui.gfxHigh },
    { id: 'cinematic', label: ui.gfxCinematic },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.settings}
        className="iron-panel rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="hazard-stripe-bar h-1.5 w-full" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff6b1a]/25">
          <h2 className="font-display text-2xl font-bold tracking-wider text-[#ff8c38]">
            {ui.settings}
          </h2>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              onClose();
            }}
            aria-label={ui.close}
            className="iron-btn rounded-lg p-2"
          >
            <X className="w-4 h-4 text-[#d6dbe0]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto iron-scroll space-y-6">
          {/* Difficulty (smooth color tween transition) */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[#848d99] mb-2">{ui.difficultyLabel}</div>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.map((d) => {
                const active = settings.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(true);
                      onUpdateSettings({ ...settings, difficulty: d.id });
                    }}
                    className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors duration-200 ${
                      active
                        ? 'bg-[#ff6b1a] text-[#0b0d10] border border-[#ff9f66] shadow-[0_0_16px_rgba(255,107,26,0.45)]'
                        : 'iron-btn'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Graphics Quality + Optional CRT Scanline Filter */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-[#848d99]">{ui.graphicsLabel}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {graphicsLevels.map((g) => {
                const active = settings.graphics === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(true);
                      onUpdateSettings({ ...settings, graphics: g.id });
                    }}
                    className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-300 ${
                      active
                        ? 'bg-[#84cc16] text-[#0b0d10] border border-[#bef264]'
                        : 'iron-btn'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-between gap-3 text-xs text-[#cbd5e1] iron-panel-subtle rounded-lg px-3.5 py-2.5">
              <div>
                <div className="font-bold text-[#d6dbe0]">{ui.crtLabel}</div>
                <div className="text-[11px] text-[#848d99]">{ui.crtHint}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.crtScanlines}
                onChange={(e) => {
                  soundEngine.playUiClick(true);
                  onUpdateSettings({ ...settings, crtScanlines: e.target.checked });
                }}
                className="accent-[#ff6b1a] w-4 h-4"
              />
            </label>
          </div>

          {/* Audio Mix with slider rustle SFX */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[#848d99] mb-2">{ui.audioLabel}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 iron-panel-subtle rounded-lg p-4">
              {[
                { key: 'musicVolume' as const, label: ui.musicVol, val: settings.musicVolume },
                { key: 'sfxVolume' as const, label: ui.sfxVol, val: settings.sfxVolume },
                { key: 'ambientVolume' as const, label: ui.ambientVol, val: settings.ambientVolume },
              ].map((s) => (
                <label key={s.key} className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#cbd5e1]">{s.label}</span>
                    <span className="font-mono-num text-[#ff8c38]">{Math.round(s.val * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(s.val * 100)}
                    onChange={(e) => {
                      soundEngine.playSliderRustle();
                      onUpdateSettings({
                        ...settings,
                        [s.key]: Number(e.target.value) / 100,
                      });
                    }}
                    className="accent-[#ff6b1a]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* 16 Languages Selector */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[#848d99] mb-2">{ui.language} (16)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORTED_LANGUAGES.map((l) => {
                const active = settings.language === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(true);
                      onUpdateSettings({ ...settings, language: l.code as LanguageCode });
                    }}
                    className={`rounded-lg px-2.5 py-2 text-xs font-medium truncate transition-colors ${
                      active ? 'gold-btn font-bold' : 'iron-btn'
                    }`}
                  >
                    {l.nativeName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mouse & Keyboard Keybindings */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider text-[#848d99]">{ui.keybindsLabel}</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(true);
                  onUpdateSettings({ ...settings, keybindings: { ...DEFAULT_KEYBINDINGS } });
                }}
                className="iron-btn rounded px-2.5 py-1 text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-[#ff6b1a]" />
                <span>{ui.resetDefaults}</span>
              </button>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-[#cbd5e1] mb-3 iron-panel-subtle rounded-lg px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={settings.rmbJumpTap}
                onChange={(e) => {
                  soundEngine.playUiClick(true);
                  onUpdateSettings({ ...settings, rmbJumpTap: e.target.checked });
                }}
                className="accent-[#ff6b1a]"
              />
              <span>{ui.rmbJumpHint}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KEYBIND_LABELS.map((item) => {
                const isListening = listeningAction === item.action;
                return (
                  <div
                    key={item.action}
                    className="flex items-center justify-between iron-panel-subtle rounded-lg px-3 py-2 text-xs"
                  >
                    <span className="text-[#cbd5e1]">{isRu ? item.labelRu : item.labelEn}</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(true);
                        setListeningAction(item.action);
                      }}
                      className={`px-2.5 py-1 rounded font-mono-num text-[11px] min-w-[76px] text-center ${
                        isListening ? 'gold-btn font-bold' : 'iron-btn'
                      }`}
                    >
                      {isListening ? ui.pressAnyKey : settings.keybindings[item.action]}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
