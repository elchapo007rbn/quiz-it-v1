'use client';

interface Props {
  onSelect: (interest: 'male' | 'female' | 'both') => void;
  onBack: () => void;
  progressPct: number;
}

export function Step02Interest({ onSelect, onBack, progressPct }: Props) {
  return (
    <div className="aur-select">
      <button className="aur-back" onClick={onBack} aria-label="Indietro">&lsaquo;</button>
      <div className="progress-wrap" style={{ maxWidth: 420, padding: 0 }}>
        <div className="progress-bg" style={{ background: 'rgba(122,69,232,0.15)' }}>
          <div className="progress-fill" style={{ width: `${progressPct}%`, background: 'var(--grad-iris)' }} />
        </div>
      </div>
      <h2 className="aur-title">Chi ti interessa?</h2>
      <div className="aur-list">
        <button className="aur-list-card" onClick={() => onSelect('male')}>
          <div className="aur-list-avatar">👨</div>
          <div className="aur-list-label">Uomini</div>
        </button>
        <button className="aur-list-card" onClick={() => onSelect('female')}>
          <div className="aur-list-avatar">👩</div>
          <div className="aur-list-label">Donne</div>
        </button>
        <button className="aur-list-card" onClick={() => onSelect('both')}>
          <div className="aur-list-avatar">💞</div>
          <div className="aur-list-label">Entrambi</div>
        </button>
      </div>
    </div>
  );
}
