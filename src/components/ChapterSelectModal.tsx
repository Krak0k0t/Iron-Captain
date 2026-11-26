import React, { useState } from 'react';
import { CheckCircle2, Lock, Play, X } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { CampaignSave, ChapterId, LanguageCode } from '../game/types';
import { CHAPTERS } from '../game/storyData';
import { RelicPixelIcon } from './SvgIcons';
import { soundEngine } from '../audio/soundEngine';

interface ChapterSelectModalProps {
  ui: UiStrings;
  language: LanguageCode;
  save: CampaignSave;
  inActiveGameplay: boolean;
  onSelectChapter: (chapterId: ChapterId) => void;
  onClose: () => void;
}

export const ChapterSelectModal: React.FC<ChapterSelectModalProps> = ({
  ui,
  language,
  save,
  inActiveGameplay,
  onSelectChapter,
  onClose,
}) => {
  const [pendingChapter, setPendingChapter] = useState<ChapterId | null>(null);
  const isRu = language === 'ru' || language === 'uk';

  const handleCardClick = (chapterId: ChapterId) => {
    soundEngine.playUiClick();
    if (inActiveGameplay) {
      setPendingChapter(chapterId);
    } else {
      onSelectChapter(chapterId);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.chapterSelect}
        className="iron-panel rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="hazard-stripe-bar h-1.5 w-full" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff6b1a]/25">
          <h2 className="font-display text-2xl font-bold tracking-wider text-[#ff8c38]">
            {ui.chapterSelect}
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

        <div className="p-6 overflow-y-auto iron-scroll flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {CHAPTERS.map((ch) => {
              const isCompleted = save.completedChapters.includes(ch.id);
              const isUnlocked = save.unlockedChapters.includes(ch.id);
              const rewards = save.rewards[ch.id] ?? [];

              const statusLabel = isCompleted
                ? ui.statusCompleted
                : isUnlocked
                  ? ui.statusAvailable
                  : ui.statusLocked;

              const actBadge =
                ch.actNumber === 0 ? ui.prologLabel : `${ui.actLabel} ${ch.actNumber}`;

              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => handleCardClick(ch.id)}
                  className={`text-left rounded-lg p-4 border flex flex-col justify-between gap-2 ${
                    isUnlocked
                      ? 'iron-btn border-[#ff6b1a]/35 hover:border-[#ff8c38]'
                      : 'bg-[#0b0d10] border-white/10 text-[#64748b] cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`text-[11px] uppercase tracking-wider mb-0.5 ${
                          isUnlocked ? 'text-[#848d99]' : 'text-[#5b6678]'
                        }`}
                      >
                        {actBadge} · {statusLabel}
                      </div>
                      <div
                        className={`font-display text-base font-bold ${
                          isUnlocked ? 'text-[#d6dbe0]' : 'text-[#7c8798]'
                        }`}
                      >
                        {isUnlocked ? (isRu ? ch.titleRu : ch.titleEn) : `${ui.lockedTitle} #${ch.orderIndex + 1}`}
                      </div>
                      {isUnlocked && (
                        <div className="text-xs text-[#848d99] mt-0.5">
                          {isRu ? ch.subtitleRu : ch.subtitleEn}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 mt-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#a3e635]" />
                      ) : isUnlocked ? (
                        <Play className="w-5 h-5 text-[#ff8c38]" />
                      ) : (
                        <Lock className="w-5 h-5 text-[#5b6678]" />
                      )}
                    </div>
                  </div>

                  {isUnlocked && rewards.length > 0 && (
                    <div className="flex items-center gap-2.5 text-[11px] text-[#a3e635] pt-2 border-t border-white/10">
                      <RelicPixelIcon relicId={ch.rewardId} className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {ui.rewardLabel}: {isRu ? ch.rewardLabelRu : ch.rewardLabelEn}
                        </div>
                        <div className="text-[10px] text-[#cbd5e1] truncate">
                          {isRu ? ch.rewardEffectRu : ch.rewardEffectEn}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirmation overlay if opened during active gameplay */}
        {pendingChapter && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center p-4">
            <div className="iron-panel rounded-xl max-w-md w-full p-6 text-center">
              <p className="font-serif-body text-sm text-[#d6dbe0] mb-5 leading-relaxed">
                {ui.confirmChapterLeave}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(true);
                    setPendingChapter(null);
                  }}
                  className="iron-btn rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {ui.confirmNo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    const ch = pendingChapter;
                    setPendingChapter(null);
                    onSelectChapter(ch);
                  }}
                  className="gold-btn rounded-lg px-5 py-2 text-sm font-bold"
                >
                  {ui.confirmYes}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
