import React from 'react';
import { Anchor, Layers, Play, RotateCcw, Settings, Home } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { CampaignSave, EndingId, LanguageCode } from '../game/types';
import { ENDINGS } from '../game/storyData';
import { formatWindowWeeks, getAveragePartyApproval } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface PauseModalProps {
  ui: UiStrings;
  onResume: () => void;
  onOpenCommandDeck: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onRestartChapter: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  ui,
  onResume,
  onOpenCommandDeck,
  onOpenChapters,
  onOpenSettings,
  onRestartChapter,
  onReturnToTitle,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pause"
      className="iron-panel rounded-xl max-w-sm w-full overflow-hidden"
    >
      <div className="hazard-stripe-bar h-1.5 w-full" />
      <div className="p-6 flex flex-col gap-2.5">
        <h2 className="font-display text-2xl font-bold text-center tracking-widest text-[#ff8c38] mb-2">
          {ui.gameTitle}
        </h2>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onResume();
          }}
          className="gold-btn rounded-lg px-4 py-3 text-sm font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{ui.resume}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenCommandDeck();
          }}
          className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Anchor className="w-4 h-4 text-[#ff6b1a]" />
          <span>{ui.commandDeck}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenChapters();
          }}
          className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
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
          className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4 text-[#ff6b1a]" />
          <span>{ui.settings}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onRestartChapter();
          }}
          className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-[#ff6b1a]" />
          <span>{ui.restartChapter}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick(true);
            onReturnToTitle();
          }}
          className="iron-btn rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4 text-[#848d99]" />
          <span>{ui.returnToMenu}</span>
        </button>
      </div>
    </div>
  </div>
);

interface GameOverModalProps {
  ui: UiStrings;
  language: LanguageCode;
  outcome: 'defeat' | 'ending';
  endingId?: EndingId;
  save: CampaignSave;
  score: number;
  onRetry: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  ui,
  language,
  outcome,
  endingId,
  save,
  score,
  onRetry,
  onReturnToTitle,
}) => {
  const isRu = language === 'ru' || language === 'uk';
  const ending = endingId ? ENDINGS[endingId] : null;
  const win = formatWindowWeeks(save.windowWeeks);
  const avgApproval = getAveragePartyApproval(save.party, save.flags.theoJoined);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ending ? (isRu ? ending.titleRu : ending.titleEn) : ui.defeatTitle}
        className="iron-panel rounded-xl max-w-xl w-full overflow-hidden"
      >
        <div className="hazard-stripe-bar h-1.5 w-full" />
        <div className="p-6 md:p-8">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide text-[#ff8c38] mb-3">
            {outcome === 'ending' && ending
              ? isRu
                ? ending.titleRu
                : ending.titleEn
              : ui.defeatTitle}
          </h2>

          {outcome === 'ending' && ending && (
            <>
              <p className="font-serif-body text-sm sm:text-base leading-relaxed text-[#d6dbe0] mb-4">
                {isRu ? ending.epilogueRu : ending.epilogueEn}
              </p>
              <p className="font-display italic text-sm text-[#a3e635] mb-5">
                «{isRu ? ending.toastRu : ending.toastEn}»
              </p>
            </>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6 iron-panel-subtle rounded-lg p-3.5 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#848d99]">{ui.capitalLabel}</div>
              <div className="font-mono-num text-sm font-bold text-[#a3e635]">
                {(save.capitalAK + save.lockedRealAK).toLocaleString()} AK
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#848d99]">{ui.windowLabel}</div>
              <div className="font-mono-num text-sm font-bold text-[#ef4444]">
                {win.months}{ui.monthsShort} {win.remWeeks}{ui.weeksShort}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#848d99]">
                {outcome === 'ending' ? ui.approvalLabel : 'Score'}
              </div>
              <div className="font-mono-num text-sm font-bold text-[#ff8c38]">
                {outcome === 'ending' ? `${avgApproval}/100` : score}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              data-start="true"
              onClick={() => {
                soundEngine.playStartHorn();
                onRetry();
              }}
              className="gold-btn flex-1 rounded-lg px-5 py-3 text-sm font-display font-bold uppercase tracking-wider"
            >
              {outcome === 'ending' ? ui.newGame : ui.playAgain}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(true);
                onReturnToTitle();
              }}
              className="iron-btn flex-1 rounded-lg px-5 py-3 text-sm font-medium"
            >
              {ui.returnToMenu}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
