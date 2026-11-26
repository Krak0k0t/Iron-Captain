import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Smartphone, Wrench } from 'lucide-react';
import type { UiStrings } from '../game/i18n';
import type { LanguageCode } from '../game/types';
import { evaluateCraneBalanceDrop } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface HospitalPrologueModalProps {
  ui: UiStrings;
  language: LanguageCode;
  onEnterHydrogen: (calibrationBonusAK: number) => void;
}

export const HospitalPrologueModal: React.FC<HospitalPrologueModalProps> = ({
  ui,
  language,
  onEnterHydrogen,
}) => {
  const isRu = language === 'ru' || language === 'uk';
  const [ticketNow, setTicketNow] = useState(41);
  const [balanceVal, setBalanceVal] = useState(50);
  const [hoistsAttempted, setHoistsAttempted] = useState(0);
  const [hoistsLocked, setHoistsLocked] = useState(0);
  const [lastResult, setLastResult] = useState<'idle' | 'locked' | 'tipped'>('idle');
  const [smsArrived, setSmsArrived] = useState(false);

  // Corridor LED queue ticker (#041 -> #047) & oscillating phone hoist rig gauge
  useEffect(() => {
    const start = performance.now();
    const raf = { id: 0 };
    const step = (now: number) => {
      const sec = (now - start) / 1000;
      const val = Math.round(50 + Math.sin(sec * 2.4) * 46);
      setBalanceVal(val);
      raf.id = requestAnimationFrame(step);
    };
    raf.id = requestAnimationFrame(step);

    const queueTimer = window.setInterval(() => {
      setTicketNow((prev) => (prev < 47 ? prev + 1 : prev));
    }, 1800);

    const smsTimer = window.setTimeout(() => {
      setSmsArrived(true);
    }, 4500);

    return () => {
      cancelAnimationFrame(raf.id);
      window.clearInterval(queueTimer);
      window.clearTimeout(smsTimer);
    };
  }, []);

  const handleTestHoist = () => {
    soundEngine.unlock();
    const evalRes = evaluateCraneBalanceDrop(balanceVal);
    setHoistsAttempted((c) => c + 1);
    if (evalRes.stable) {
      soundEngine.playInteractChime();
      setHoistsLocked((c) => c + 1);
      setLastResult('locked');
    } else {
      soundEngine.playHurt();
      setLastResult('tipped');
    }
    if (!smsArrived) {
      window.setTimeout(() => setSmsArrived(true), 450);
    }
  };

  const trialBonusAK = hoistsLocked * 10000;

  return (
    <div
      data-testid="hospital-prologue-modal"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#07090c]/92"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.hospTitle}
        className="iron-panel rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto iron-scroll flex flex-col"
      >
        {/* Top Hazard Header Strip */}
        <div className="hazard-stripe-bar h-2 w-full" />

        <div className="p-4 sm:p-6 space-y-4">
          {/* Corridor Header + LED Queue Board */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#848d99]">
                <Activity className="w-3.5 h-3.5 text-[#ef4444] animate-pulse" />
                <span>{ui.realWorldTag}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wider text-[#d6dbe0] mt-0.5">
                {ui.hospTitle}
              </h2>
            </div>

            <div className="iron-panel-subtle rounded-lg px-3 py-2 flex items-center gap-4 border border-[#848d99]/30">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#848d99]">{ui.hospQueueLabel}</div>
                <div className="flex items-center gap-3 font-mono-num text-sm mt-0.5">
                  <span className="text-[#a3e635]">
                    {ui.hospTicketNow}: <strong>#0{ticketNow}</strong>
                  </span>
                  <span className="text-[#ef4444]">
                    {ui.hospTicketYours}: <strong>#089</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Narrative Corridor Framing */}
          <p className="text-xs sm:text-sm leading-relaxed text-[#b8c0ca]">
            {isRu
              ? 'Холодный линолеум больничного коридора. Спина ноет в пояснице L4–L5 так, что пальцы немеют — но на треснувшем экране телефона уже крутится пробный клиент «Водорода». Дед оставил старые портовые схемы крана.'
              : 'Fluorescent flicker over cold linoleum. Your L4–L5 vertebrae burn down to your fingertips—yet on a cracked phone screen, the Hydrogen trial client hums. Grandpa left his old gantry counterweight schematics inside.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cracked Phone: Interactive Counterweight Hoist Calibration */}
            <div className="iron-panel-subtle rounded-xl p-4 border border-[#84cc16]/35 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a3e635]">
                    <Smartphone className="w-3.5 h-3.5" />
                    {ui.hospPhoneTitle}
                  </span>
                </div>
                <p className="text-xs text-[#848d99] leading-snug mb-3">{ui.hospPhoneHint}</p>

                {/* Live Counterweight Gauge */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] font-mono-num mb-1">
                    <span className="text-[#848d99]">{ui.hospBalanceLabel}</span>
                    <span
                      className={
                        balanceVal >= 28 && balanceVal <= 72 ? 'text-[#a3e635] font-bold' : 'text-[#ff6b1a] font-bold'
                      }
                    >
                      {balanceVal}% · {balanceVal >= 28 && balanceVal <= 72 ? 'SAFE ZONE' : 'TIPPING'}
                    </span>
                  </div>
                  <div className="relative h-5 rounded bg-[#080a0d] border border-[#49525e] overflow-hidden">
                    {/* Center Safe Calibration Zone (28% to 72%) */}
                    <div
                      className="absolute inset-y-0 bg-[#84cc16]/20 border-x border-[#a3e635]/60"
                      style={{ left: '28%', width: '44%' }}
                    />
                    {/* Live Indicator Needle */}
                    <div
                      className={`absolute top-0 bottom-0 w-2 -translate-x-1/2 transition-none ${
                        balanceVal >= 28 && balanceVal <= 72 ? 'bg-[#a3e635]' : 'bg-[#ff6b1a]'
                      }`}
                      style={{ left: `${balanceVal}%` }}
                    />
                  </div>
                </div>

                {lastResult !== 'idle' && (
                  <div
                    className={`text-xs font-mono-num font-bold mb-2 ${
                      lastResult === 'locked' ? 'text-[#a3e635]' : 'text-[#ef4444]'
                    }`}
                  >
                    {lastResult === 'locked'
                      ? isRu
                        ? `ПРОТИВОВЕС ЗАФИКСИРОВАН (${hoistsLocked}) · +${trialBonusAK.toLocaleString()} AK`
                        : `COUNTERWEIGHT LOCKED (${hoistsLocked}) · +${trialBonusAK.toLocaleString()} AK`
                      : isRu
                        ? 'ПЕРЕКОС БАЛКИ! Лови зелёный центр [28–72].'
                        : 'RIG TIPPED! Catch the phosphor zone [28–72].'}
                  </div>
                )}
              </div>

              <button
                type="button"
                data-testid="hosp-test-hoist-btn"
                onClick={handleTestHoist}
                className="crane-switch-btn rounded-lg px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-[#d6dbe0] flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4 text-[#ff6b1a]" />
                <span>{ui.hospTestHoistBtn}</span>
              </button>
            </div>

            {/* Clinic Notification / Doctor SMS Card */}
            <div
              className={`rounded-xl p-4 border flex flex-col justify-between gap-3 transition-all duration-300 ${
                smsArrived
                  ? 'iron-panel-subtle border-[#ef4444]/65 shadow-[0_0_24px_rgba(239,68,68,0.18)]'
                  : 'bg-[#0b0d10]/70 border-white/10 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ef4444]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {ui.realPhoneTag}
                  </span>
                  <span className="font-mono-num text-[10px] text-[#848d99]">
                    {smsArrived ? 'SMS · NOW' : 'WAITING SIGNAL...'}
                  </span>
                </div>

                {smsArrived ? (
                  <>
                    <div className="font-display font-bold text-sm text-[#ff8c38] mb-1.5">
                      {ui.hospDoctorAlertTitle}
                    </div>
                    <p className="text-xs leading-relaxed text-[#d6dbe0]">{ui.hospDoctorAlertBody}</p>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-[#848d99]">
                    {isRu
                      ? 'Проверь строповку на пробном кране, пока регистратура обрабатывает направление №089...'
                      : 'Test the counterweight rig on the trial screen while the clinic registry processes referral #089...'}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-[#ff8c38] border-t border-white/10 pt-2.5">
                {ui.hospChoiceLine}
              </div>
            </div>
          </div>

          {/* Enter Hydrogen Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="text-[11px] font-mono-num text-[#848d99]">
              {hoistsAttempted > 0
                ? isRu
                  ? `Стартовый бонус с телефона: +${trialBonusAK.toLocaleString()} AK`
                  : `Phone trial credit: +${trialBonusAK.toLocaleString()} AK`
                : isRu
                  ? 'Окно операции: 10 месяцев · Цель: 2 300 000 AK'
                  : 'Surgical Window: 10 months · Target: 2,300,000 AK'}
            </div>

            <button
              type="button"
              data-testid="hosp-enter-hydrogen-btn"
              onClick={() => {
                soundEngine.playStartHorn();
                onEnterHydrogen(trialBonusAK);
              }}
              className="gold-btn rounded-lg px-6 py-3 font-display text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>{ui.hospEnterHydrogenBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
