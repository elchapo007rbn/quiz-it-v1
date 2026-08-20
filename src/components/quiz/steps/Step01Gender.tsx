'use client';

interface Props {
  onSelect: (gender: 'male' | 'female') => void;
  onBack: () => void;
  progressPct: number;
}

export function Step01Gender({ onSelect, onBack, progressPct }: Props) {
  return (
    <div className="aur-select">
      <button className="aur-back" onClick={onBack} aria-label="Indietro">&lsaquo;</button>
      <div className="progress-wrap" style={{ maxWidth: 420, padding: 0 }}>
        <div className="progress-bg" style={{ background: 'rgba(122,69,232,0.15)' }}>
          <div className="progress-fill" style={{ width: `${progressPct}%`, background: 'var(--grad-iris)' }} />
        </div>
      </div>
      <h2 className="aur-title">Seleziona il tuo genere</h2>
      <div className="aur-grid">
        <button className="aur-card" onClick={() => onSelect('male')}>
          <div className="aur-avatar">👨</div>
          <div className="aur-label">Uomo</div>
        </button>
        <button className="aur-card" onClick={() => onSelect('female')}>
          <div className="aur-avatar">👩</div>
          <div className="aur-label">Donna</div>
        </button>
      </div>
    </div>
  );
}
