import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { DialogueChoice, DialogueNode, LanguageCode } from '../game/types';
import { soundEngine } from '../audio/soundEngine';

interface DialogueOverlayProps {
  ui: UiStrings;
  language: LanguageCode;
  node: DialogueNode;
  capitalAK: number;
  onSelectChoice: (choice: DialogueChoice) => void;
}

const SPEAKER_COLORS: Record<DialogueNode['speakerId'], string> = {
  narrator: '#848d99',
  artem: '#ff8c38',
  yaga: '#a3e635',
  nail: '#ff6b1a',
  ledger: '#84cc16',
  grandpa: '#ff9c59',
  theo: '#a78bfa',
  stremya: '#fb7185',
  myakish: '#f97316',
  stern: '#ef4444',
  duty: '#a3e635',
};

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  ui,
  language,
  node,
  capitalAK,
  onSelectChoice,
}) => {
  const isRu = language === 'ru' || language === 'uk';
  const speakerName = isRu ? node.speakerNameRu : node.speakerNameEn;
  const location = isRu ? node.locationRu : node.locationEn;
  const bodyText = isRu ? node.textRu : node.textEn;
  const accent = SPEAKER_COLORS[node.speakerId] ?? '#ff8c38';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/72">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={speakerName}
        className="iron-panel rounded-xl max-w-2xl w-full overflow-hidden"
      >
        <div className="hazard-stripe-bar h-1.5 w-full" />
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#848d99] mb-3">
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: accent }}>
              {node.isRealWorld ? <ShieldAlert className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {node.isRealWorld ? ui.realWorldTag : ui.hydrogenTag}
            </span>
            <span className="font-mono-num">{location}</span>
          </div>

          <h2
            className="font-display text-2xl font-bold tracking-wide mb-3"
            style={{ color: accent }}
          >
            {speakerName}
          </h2>

          <p className="font-serif-body text-sm sm:text-base leading-relaxed text-[#d6dbe0] mb-6 max-w-[65ch]">
            {bodyText}
          </p>

          <div className="flex flex-col gap-2.5">
            {node.choices.map((choice, idx) => {
              const label = isRu ? choice.labelRu : choice.labelEn;
              const hint = isRu ? choice.hintRu : choice.hintEn;
              const disabled =
                choice.minCapital !== undefined && capitalAK < choice.minCapital;
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSelectChoice(choice);
                  }}
                  className={`${
                    idx === 0 ? 'gold-btn' : 'iron-btn'
                  } rounded-lg px-4 py-3 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 disabled:opacity-45`}
                >
                  <span className="text-sm font-bold">{label}</span>
                  {hint && (
                    <span
                      className={`text-xs ${
                        idx === 0 ? 'text-[#0b0d10]/85 font-semibold' : 'text-[#848d99]'
                      }`}
                    >
                      {hint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
