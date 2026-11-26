import React, { useState } from 'react';
import { BookOpen, Coins, Radio, Shield, Users, X } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { AuctionLot, CampaignSave, LanguageCode, PartyMemberId } from '../game/types';
import { ALMANAC_ENTRIES, CHAPTERS, PARTY_MEMBERS, SECTOR_LORE_CODEX } from '../game/storyData';
import {
  computeRelicBonuses,
  getAveragePartyApproval,
  isPartyCouncilRevolting,
} from '../game/rules';
import { RelicPixelIcon } from './SvgIcons';
import { soundEngine } from '../audio/soundEngine';

interface CommandDeckModalProps {
  ui: UiStrings;
  language: LanguageCode;
  save: CampaignSave;
  lots: AuctionLot[];
  onTradeLot: (lotId: string) => void;
  onDualEconomyAction: (mode: 'lock' | 'reinvest', amount: number) => void;
  onClose: () => void;
}

export const CommandDeckModal: React.FC<CommandDeckModalProps> = ({
  ui,
  language,
  save,
  lots,
  onTradeLot,
  onDualEconomyAction,
  onClose,
}) => {
  const [tab, setTab] = useState<'party' | 'almanac' | 'relics' | 'lore' | 'market'>('party');
  const isRu = language === 'ru' || language === 'uk';

  const memberIds: PartyMemberId[] = save.flags.theoJoined
    ? ['yaga', 'nail', 'ledger', 'grandpa', 'theo']
    : ['yaga', 'nail', 'ledger', 'grandpa'];

  const avgApproval = getAveragePartyApproval(save.party, save.flags.theoJoined);
  const revolting = isPartyCouncilRevolting(save.party, save.flags.theoJoined);
  const surgeryPct = Math.min(100, Math.round((save.lockedRealAK / save.surgeryTargetAK) * 100));
  const bonuses = computeRelicBonuses(save);
  const unlockedLore = save.unlockedLore ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.commandDeck}
        className="iron-panel rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="hazard-stripe-bar h-1.5 w-full" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff6b1a]/25">
          <h2 className="font-display text-2xl font-bold tracking-wider text-[#ff8c38]">
            {ui.commandDeck}
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

        {/* Segmented tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 bg-[#090b0e]/80 border-b border-white/10">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              setTab('party');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'party' ? 'gold-btn' : 'iron-btn'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{ui.partyTab}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              setTab('almanac');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'almanac' ? 'gold-btn' : 'iron-btn'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{ui.almanacTab}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              setTab('relics');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'relics' ? 'gold-btn' : 'iron-btn'
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              {ui.relicsTab} ({bonuses.ownedRelics.length}/12)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              setTab('lore');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'lore' ? 'gold-btn' : 'iron-btn'
            }`}
          >
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              {ui.loreTab} ({unlockedLore.length}/12)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(true);
              setTab('market');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'market' ? 'gold-btn' : 'iron-btn'
            }`}
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{ui.marketTab}</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto iron-scroll flex-1">
          {tab === 'party' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-white/10">
                <span className="text-[#848d99]">
                  {ui.approvalLabel}:{' '}
                  <strong className="font-mono-num text-[#ff8c38]">{avgApproval}/100</strong>
                </span>
                <span className={revolting ? 'text-[#ef4444] font-bold' : 'text-[#a3e635] font-medium'}>
                  {revolting ? ui.councilMutiny : ui.councilHealthy}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {memberIds.map((id) => {
                  const m = PARTY_MEMBERS[id];
                  const val = save.party[id];
                  return (
                    <div key={id} className="iron-panel-subtle rounded-lg p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display font-bold text-base" style={{ color: m.color }}>
                          {isRu ? m.nameRu : m.nameEn}
                        </span>
                        <span className="font-mono-num text-xs font-bold text-[#d6dbe0]">{val}%</span>
                      </div>
                      <div className="text-xs text-[#cbd5e1] mb-1">
                        {isRu ? m.roleRu : m.roleEn}
                      </div>
                      <div className="text-[11px] text-[#848d99] mb-3">
                        {isRu ? m.realRu : m.realEn}
                      </div>
                      <div className="h-2 rounded-xs bg-[#080a0d] overflow-hidden border border-white/10">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${val}%`, backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'almanac' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ALMANAC_ENTRIES.map((entry) => {
                const unlocked = save.unlockedAlmanac.includes(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg p-4 border ${
                      unlocked
                        ? 'iron-panel-subtle border-[#ff6b1a]/40'
                        : 'bg-[#090b0e]/60 border-white/10 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#848d99] mb-1">
                      <span>{entry.chapterHint}</span>
                      <span>{unlocked ? ui.statusAvailable : ui.statusLocked}</span>
                    </div>
                    <div className="font-display font-bold text-base text-[#ff8c38] mb-1.5">
                      {unlocked ? (isRu ? entry.titleRu : entry.titleEn) : '???'}
                    </div>
                    <p className="text-xs leading-relaxed text-[#cbd5e1]">
                      {unlocked ? (isRu ? entry.mechanicRu : entry.mechanicEn) : ui.lockedTitle}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'relics' && (
            <div className="space-y-4">
              {/* Cumulative Active Relic Enhancements */}
              <div className="iron-panel-subtle rounded-lg p-4 border border-[#ff6b1a]/30">
                <div className="text-xs uppercase tracking-wider text-[#ff8c38] font-bold mb-2">
                  {ui.relicBuffsLabel}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[#848d99]">HP</div>
                    <div className="font-mono-num font-bold text-[#a3e635]">
                      {100 + bonuses.maxHpBonus} (+{bonuses.maxHpBonus})
                    </div>
                  </div>
                  <div>
                    <div className="text-[#848d99]">Speed</div>
                    <div className="font-mono-num font-bold text-[#a3e635]">
                      {Math.round(bonuses.moveSpeedMult * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[#848d99]">Crane / Skills</div>
                    <div className="font-mono-num font-bold text-[#ff8c38]">
                      x{bonuses.craneDamageMult} DMG · {Math.round((1 - bonuses.craneCooldownMult) * 100)}% CDR
                    </div>
                  </div>
                  <div>
                    <div className="text-[#848d99]">AK Yield</div>
                    <div className="font-mono-num font-bold text-[#a3e635]">
                      x{bonuses.bonusAkMult}
                    </div>
                  </div>
                </div>
              </div>

              {/* 12 Relics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {CHAPTERS.map((ch) => {
                  const owned = bonuses.ownedRelics.includes(ch.rewardId);
                  return (
                    <div
                      key={ch.id}
                      className={`rounded-lg p-3.5 border flex items-start gap-3 ${
                        owned
                          ? 'iron-panel-subtle border-[#ff6b1a]/45'
                          : 'bg-[#0b0d10] border-white/10 opacity-75'
                      }`}
                    >
                      <RelicPixelIcon relicId={ch.rewardId} locked={!owned} className="w-10 h-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-[#848d99] mb-0.5">
                          <span>{isRu ? ch.titleRu : ch.titleEn}</span>
                          <span className={owned ? 'text-[#a3e635] font-bold' : 'text-[#64748b]'}>
                            {owned ? ui.statusAvailable : ui.statusLocked}
                          </span>
                        </div>
                        <div className="font-display font-bold text-sm text-[#ff8c38] mb-1">
                          {isRu ? ch.rewardLabelRu : ch.rewardLabelEn}
                        </div>
                        <div className="text-xs leading-snug text-[#cbd5e1]">
                          {isRu ? ch.rewardEffectRu : ch.rewardEffectEn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'lore' && (
            <div className="space-y-4">
              <div className="iron-panel-subtle rounded-lg px-4 py-3 text-xs text-[#cbd5e1] border border-[#a78bfa]/35 flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#a78bfa] shrink-0" />
                <span>{ui.loreEmptyHint}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {CHAPTERS.map((ch) => {
                  const entry = SECTOR_LORE_CODEX[ch.id];
                  const unlocked = unlockedLore.includes(ch.id);
                  const crew = PARTY_MEMBERS[entry.crewMember];
                  return (
                    <div
                      key={ch.id}
                      className={`rounded-lg p-4 border ${
                        unlocked
                          ? 'iron-panel-subtle border-[#a78bfa]/45'
                          : 'bg-[#090b0e]/60 border-white/10 opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider mb-1">
                        <span className="font-mono-num text-[#a78bfa]">{entry.code}</span>
                        <span style={{ color: unlocked ? crew.color : '#64748b' }}>
                          {unlocked ? (isRu ? entry.sourceRu : entry.sourceEn) : ui.statusLocked}
                        </span>
                      </div>
                      <div className="font-display font-bold text-sm text-[#ff8c38] mb-1.5">
                        {unlocked ? (isRu ? entry.titleRu : entry.titleEn) : ui.lockedTitle}
                      </div>
                      <p className="text-xs leading-relaxed text-[#cbd5e1]">
                        {unlocked ? (isRu ? entry.bodyRu : entry.bodyEn) : '■■■■■ ■■■■■■■ ■■■■ ■■■■■■■■■'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'market' && (
            <div className="space-y-5">
              {/* Surgery Fund & Dual Economy Box */}
              <div className="iron-panel-subtle rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="text-xs text-[#848d99]">{ui.surgeryGoalLabel}</div>
                    <div className="font-mono-num text-lg font-bold text-[#a3e635]">
                      {save.lockedRealAK.toLocaleString()} / {save.surgeryTargetAK.toLocaleString()} AK ({surgeryPct}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#848d99]">{ui.capitalLabel}</div>
                    <div className="font-mono-num text-lg font-bold text-[#ff8c38]">
                      {save.capitalAK.toLocaleString()} AK
                    </div>
                  </div>
                </div>

                <div className="h-2.5 bg-[#080a0d] rounded-xs overflow-hidden border border-[#84cc16]/30 mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#4d7c0f] to-[#a3e635] transition-all duration-300"
                    style={{ width: `${surgeryPct}%` }}
                  />
                </div>

                {save.flags.gatewayFrozen ? (
                  <div className="text-xs font-bold text-[#ef4444] py-2">{ui.gatewayFrozenMsg}</div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={save.capitalAK < 200000}
                      onClick={() => {
                        soundEngine.playInteractChime();
                        onDualEconomyAction('lock', 200000);
                      }}
                      className="gold-btn rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      {ui.lockFundsBtn}
                    </button>
                    <button
                      type="button"
                      disabled={save.capitalAK < 200000}
                      onClick={() => {
                        soundEngine.playUiClick();
                        onDualEconomyAction('reinvest', 200000);
                      }}
                      className="iron-btn rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      {ui.reinvestBtn}
                    </button>
                  </div>
                )}
              </div>

              {/* Auction Sniper Lots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {lots.map((lot) => {
                  const canAfford = !lot.sold && save.capitalAK >= lot.buyPrice;
                  return (
                    <div key={lot.id} className="iron-panel-subtle rounded-lg p-4 flex flex-col justify-between gap-3">
                      <div>
                        <div className="font-display font-bold text-sm text-[#d6dbe0] mb-1">
                          {isRu ? lot.titleRu : lot.titleEn}
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#848d99]">
                          <span>
                            Buy: <strong className="font-mono-num text-[#ff8c38]">{lot.buyPrice.toLocaleString()}</strong>
                          </span>
                          <span>
                            Est: <strong className="font-mono-num text-[#a3e635]">{lot.estimatedValue.toLocaleString()}</strong>
                          </span>
                          <span>Risk: {lot.riskPercent}%</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          soundEngine.playInteractChime();
                          onTradeLot(lot.id);
                        }}
                        className="iron-btn rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40"
                      >
                        {lot.sold ? ui.statusCompleted : ui.buySellBtn}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

