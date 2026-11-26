import React from 'react';

export const IronCaptainEmblem: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ic-hazard-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff9c59" />
        <stop offset="50%" stopColor="#ff6b1a" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
      <linearGradient id="ic-iron-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2d333c" />
        <stop offset="100%" stopColor="#0f1216" />
      </linearGradient>
    </defs>
    {/* Outer riveted steel shield */}
    <path
      d="M40 4 L70 16 V42 C70 59 56 71 40 76 C24 71 10 59 10 42 V16 Z"
      fill="url(#ic-iron-grad)"
      stroke="url(#ic-hazard-grad)"
      strokeWidth="3"
    />
    <path
      d="M40 10 L64 20 V41 C64 55 52 65 40 69 C28 65 16 55 16 41 V20 Z"
      fill="none"
      stroke="#848d99"
      strokeOpacity="0.45"
      strokeWidth="1.2"
    />
    {/* Crane hook + ship wheel cross */}
    <path
      d="M40 17 V44 C40 50 45 53 49 50 C52 48 51 43 47 43"
      fill="none"
      stroke="url(#ic-hazard-grad)"
      strokeWidth="3.6"
      strokeLinecap="round"
    />
    <circle cx="40" cy="24" r="4.5" fill="#a3e635" stroke="#0b0d10" strokeWidth="1.5" />
    {/* Maritime crossbar */}
    <path d="M24 36 H56" stroke="url(#ic-hazard-grad)" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="24" cy="36" r="2.2" fill="#ff9c59" />
    <circle cx="56" cy="36" r="2.2" fill="#ff9c59" />
  </svg>
);

export const CraneSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 5 H20 M12 5 V12 C12 14.5 14.5 15.5 16 14" fill="none" stroke="#ff8c38" strokeWidth="2.1" strokeLinecap="round" />
    <rect x="6" y="16" width="12" height="4" rx="0.8" fill="#ff6b1a" stroke="#0b0d10" strokeWidth="1.2" />
  </svg>
);

export const GrappleSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 20 L15 9 M11 6 L18 6 L18 13" fill="none" stroke="#a3e635" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17" cy="7" r="2.2" fill="#ff8c38" />
  </svg>
);

export const SlamSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" fill="#a3e635" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#ff6b1a" strokeWidth="1.8" strokeDasharray="4 2" />
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="#a3e635" strokeOpacity="0.5" strokeWidth="1.2" />
  </svg>
);

export const InteractSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <polygon points="12,3 20,12 12,21 4,12" fill="none" stroke="#a3e635" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="#ff6b1a" />
  </svg>
);

export const JumpSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 18 V6 M7 11 L12 6 L17 11" fill="none" stroke="#d6dbe0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 20 H19" stroke="#ff6b1a" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const AttackSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M5 18 L14 9 M11 5 L19 5 L19 13"
      fill="none"
      stroke="#ff8c38"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 13 C7 8 11 5 17 4" fill="none" stroke="#a3e635" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2" />
    <rect x="3.5" y="15.5" width="5" height="5" rx="1" fill="#ff6b1a" stroke="#0b0d10" strokeWidth="1.2" />
  </svg>
);

export const DashSkillIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M5 7 L11 12 L5 17" fill="none" stroke="#a3e635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 7 L18 12 L12 17" fill="none" stroke="#ff8c38" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RelicPixelIcon: React.FC<{ relicId: string; className?: string; locked?: boolean }> = ({
  relicId,
  className = 'w-8 h-8',
  locked = false,
}) => {
  const hazard = locked ? '#475569' : '#ff8c38';
  const darkHazard = locked ? '#334155' : '#b8430b';
  const phosphor = locked ? '#475569' : '#a3e635';
  const limeDim = locked ? '#475569' : '#65a30d';
  const crimson = locked ? '#475569' : '#ef4444';
  const steel = locked ? '#1e293b' : '#848d99';

  const renderGlyph = () => {
    switch (relicId) {
      case 'dispatch_badge':
        return (
          <>
            <rect x="3" y="3" width="10" height="10" fill={steel} />
            <rect x="4" y="2" width="8" height="12" fill={hazard} />
            <rect x="5" y="4" width="6" height="8" fill="#111418" />
            <rect x="6" y="5" width="4" height="3" fill={phosphor} />
            <rect x="6" y="9" width="4" height="2" fill={limeDim} />
          </>
        );
      case 'hand_truck':
        return (
          <>
            <rect x="4" y="2" width="2" height="10" fill={hazard} />
            <rect x="6" y="2" width="3" height="2" fill={darkHazard} />
            <rect x="4" y="10" width="9" height="2" fill={hazard} />
            <rect x="7" y="6" width="5" height="4" fill={crimson} />
            <rect x="3" y="11" width="4" height="4" fill={steel} />
            <rect x="4" y="12" width="2" height="2" fill={phosphor} />
          </>
        );
      case 'gantry_key':
        return (
          <>
            <rect x="3" y="3" width="5" height="5" fill={hazard} />
            <rect x="4" y="4" width="3" height="3" fill="#111418" />
            <rect x="8" y="5" width="6" height="2" fill={hazard} />
            <rect x="10" y="7" width="2" height="3" fill={darkHazard} />
            <rect x="13" y="7" width="1" height="4" fill={phosphor} />
          </>
        );
      case 'polina_deed':
        return (
          <>
            <rect x="3" y="2" width="10" height="12" fill={hazard} />
            <rect x="4" y="3" width="8" height="10" fill="#161a20" />
            <rect x="5" y="5" width="6" height="2" fill={phosphor} />
            <rect x="5" y="8" width="5" height="1" fill={hazard} />
            <rect x="9" y="10" width="3" height="3" fill={crimson} />
          </>
        );
      case 'auction_cipher':
        return (
          <>
            <rect x="4" y="2" width="8" height="3" fill={phosphor} />
            <rect x="3" y="5" width="10" height="8" fill={hazard} />
            <rect x="5" y="7" width="6" height="4" fill="#111418" />
            <rect x="7" y="8" width="2" height="2" fill={limeDim} />
          </>
        );
      case 'tournament_pennant':
        return (
          <>
            <rect x="3" y="2" width="2" height="12" fill={steel} />
            <rect x="5" y="3" width="8" height="3" fill={crimson} />
            <rect x="5" y="6" width="6" height="3" fill={hazard} />
            <rect x="5" y="9" width="4" height="2" fill={phosphor} />
          </>
        );
      case 'abyssal_pass':
        return (
          <>
            <rect x="2" y="4" width="12" height="8" fill={steel} />
            <rect x="3" y="5" width="10" height="6" fill="#0b0d10" />
            <rect x="4" y="6" width="3" height="4" fill={phosphor} />
            <rect x="8" y="6" width="4" height="1" fill={limeDim} />
            <rect x="8" y="8" width="4" height="2" fill={hazard} />
          </>
        );
      case 'centurion_manifest':
        return (
          <>
            <rect x="3" y="2" width="9" height="12" fill={steel} />
            <rect x="4" y="3" width="7" height="10" fill="#13161b" />
            <rect x="5" y="4" width="5" height="2" fill={hazard} />
            <rect x="5" y="7" width="5" height="2" fill={crimson} />
            <rect x="5" y="10" width="5" height="2" fill={phosphor} />
          </>
        );
      case 'broadcast_clip':
        return (
          <>
            <rect x="2" y="4" width="12" height="8" fill={darkHazard} />
            <rect x="3" y="5" width="10" height="6" fill="#111418" />
            <rect x="6" y="6" width="4" height="4" fill={limeDim} />
            <rect x="5" y="2" width="2" height="2" fill={phosphor} />
            <rect x="9" y="2" width="2" height="2" fill={phosphor} />
          </>
        );
      case 'atlas_archive':
        return (
          <>
            <rect x="3" y="3" width="10" height="10" fill={phosphor} />
            <rect x="4" y="4" width="8" height="8" fill="#111418" />
            <rect x="6" y="5" width="4" height="6" fill={hazard} />
            <rect x="5" y="7" width="6" height="2" fill={limeDim} />
          </>
        );
      case 'crew_oath':
        return (
          <>
            <rect x="3" y="3" width="4" height="4" fill={hazard} />
            <rect x="9" y="3" width="4" height="4" fill={phosphor} />
            <rect x="6" y="6" width="4" height="4" fill={limeDim} />
            <rect x="3" y="9" width="4" height="4" fill={crimson} />
            <rect x="9" y="9" width="4" height="4" fill={hazard} />
          </>
        );
      case 'iron_crown':
      default:
        return (
          <>
            <rect x="2" y="4" width="2" height="7" fill={hazard} />
            <rect x="7" y="2" width="2" height="9" fill={hazard} />
            <rect x="12" y="4" width="2" height="7" fill={hazard} />
            <rect x="2" y="9" width="12" height="3" fill={darkHazard} />
            <rect x="4" y="7" width="8" height="2" fill={hazard} />
            <rect x="7" y="10" width="2" height="2" fill={phosphor} />
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" className={className} aria-hidden="true">
      <rect x="0" y="0" width="16" height="16" rx="2" fill="#0b0d10" />
      <rect x="0" y="0" width="16" height="1" fill={darkHazard} fillOpacity="0.65" />
      <rect x="0" y="15" width="16" height="1" fill={darkHazard} fillOpacity="0.65" />
      {renderGlyph()}
    </svg>
  );
};
