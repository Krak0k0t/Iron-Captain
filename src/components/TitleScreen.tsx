import React, { useEffect } from 'react';
import { Globe, Maximize2, Minimize2, Play, Settings, Layers, RotateCcw } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { LanguageCode } from '../game/types';
import { SUPPORTED_LANGUAGES } from '../game/i18n';
import { IronCaptainEmblem } from './SvgIcons';
import { soundEngine } from '../audio/soundEngine';

interface TitleScreenProps {
  ui: UiStrings;
  language: LanguageCode;
  hasProgress: boolean;
  isTouch: boolean;
  isFullscreen: boolean;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onChangeLanguage: (lang: LanguageCode) => void;
  onToggleFullscreen: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  ui,
  language,
  hasProgress,
  isTouch,
  isFullscreen,
  onStartNew,
  onContinue,
  onOpenChapters,
  onOpenSettings,
  onChangeLanguage,
  onToggleFullscreen,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'SELECT' || activeTag === 'INPUT') return;
        e.preventDefault();
        soundEngine.playStartHorn();
        if (hasProgress) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasProgress, onContinue, onStartNew]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Subtle left-side scrim so industrial stencil lockup pops against 3D Polina L. backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(11,13,16,0.92) 0%, rgba(11,13,16,0.62) 44%, rgba(11,13,16,0.14) 100%)',
        }}
      />

      {/* Top utility strip */}
      <div className="relative z-10 flex items-center justify-end gap-2.5 pointer-events-auto">
        <div className="flex items-center gap-2 iron-panel-subtle rounded-lg px-2.5 py-1.5">
          <Globe className="w-4 h-4 text-[#ff6b1a]" aria-hidden="true" />
          <label htmlFor="title-lang-select" className="sr-only">
            {ui.language}
          </label>
          <select
            id="title-lang-select"
            value={language}
            onChange={(e) => {
              soundEngine.playUiClick(true);
              onChangeLanguage(e.target.value as LanguageCode);
            }}
            className="bg-transparent text-xs font-medium text-[#d6dbe0] focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#0b0d10] text-[#d6dbe0]">
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick(true);
            onToggleFullscreen();
          }}
          aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
          className="iron-btn rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#ff6b1a]" /> : <Maximize2 className="w-4 h-4 text-[#ff6b1a]" />}
          <span className="hidden sm:inline">{isFullscreen ? ui.exitFullscreen : ui.fullscreen}</span>
        </button>
      </div>

      {/* Left-third negative-space Title Lockup & Primary Actions */}
      <div className="relative z-10 max-w-lg my-auto pointer-events-auto">
        <div className="flex items-center gap-4 mb-4">
          <IronCaptainEmblem className="w-16 h-16 shrink-0 drop-shadow-[0_6px_18px_rgba(255,107,26,0.35)]" />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#a3e635] font-medium">
              {ui.gameSubtitle}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[0.06em] text-[#d6dbe0] hud-text-stroke leading-tight">
              {ui.gameTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-7 max-w-xs">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              soundEngine.playStartHorn();
              if (hasProgress) onContinue();
              else onStartNew();
            }}
            className="gold-btn rounded-lg px-6 py-3.5 font-display text-base font-bold tracking-[0.08em] uppercase flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{hasProgress ? ui.continueGame : ui.startGame}</span>
          </button>

          {hasProgress && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playStartHorn();
                onStartNew();
              }}
              className="iron-btn rounded-lg px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4 text-[#ff6b1a]" />
              <span>{ui.newGame}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenChapters();
              }}
              className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Layers className="w-4 h-4 text-[#ff6b1a]" />
              <span>{ui.chapterSelect}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSettings();
              }}
              className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Settings className="w-4 h-4 text-[#ff6b1a]" />
              <span>{ui.settings}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single flat borderless bottom control hint */}
      <div className="relative z-10 text-xs text-[#848d99] tracking-wide text-center md:text-left">
        {isTouch ? ui.touchControlsHint : ui.controlsHint}
      </div>
    </div>
  );
};
