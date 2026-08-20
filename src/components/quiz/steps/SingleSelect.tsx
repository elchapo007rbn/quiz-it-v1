'use client';

interface Option {
  value: string;
  emoji: string;
  label: string;
}

interface Props {
  title: string;
  options: readonly Option[];
  onSelect: (value: string) => void;
  progressPct: number;
}

export function SingleSelect({ title, options, onSelect, progressPct }: Props) {
  return (
    <div className="aura-transition">
      <div className="progress-wrap" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="progress-bg" style={{ background: 'var(--iris100)' }}>
          <div className="progress-fill" style={{ width: `${progressPct}%`, background: 'var(--grad-iris)' }} />
        </div>
      </div>
      <div className="aura-wrap">
        <h1 className="aura-q">{title}</h1>
        <div className="aura-opts">
          {options.map(opt => (
            <button key={opt.value} className="aura-opt" onClick={() => onSelect(opt.value)}>
              <span className="em">{opt.emoji}</span>
              <span className="single">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
