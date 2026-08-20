'use client';

interface Option {
  value: string;
  emoji: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string;
  options: readonly Option[];
  values: string[];
  onChange: (values: string[]) => void;
  onNext: () => void;
  progressPct: number;
}

export function MultiSelect({ title, subtitle, options, values, onChange, onNext, progressPct }: Props) {
  const toggle = (val: string) => {
    onChange(values.includes(val) ? values.filter(v => v !== val) : [...values, val]);
  };

  return (
    <div className="qz-wrap">
      <div className="progress-wrap">
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="qz-sc">
        <h1 className="qz-h">{title}</h1>
        {subtitle && <p className="qz-sub">{subtitle}</p>}

        <div>
          {options.map(opt => (
            <button
              key={opt.value}
              className={`qz-opt${values.includes(opt.value) ? ' qz-sel' : ''}`}
              onClick={() => toggle(opt.value)}
              type="button"
            >
              <span className="qz-ic">{opt.emoji}</span>
              <span className="qz-tx">{opt.label}</span>
              <span className="qz-ck">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 6" />
                </svg>
              </span>
            </button>
          ))}
        </div>

        <button
          className={`qz-cta${values.length === 0 ? ' qz-hide' : ''}`}
          onClick={onNext}
          type="button"
        >
          Continua{' '}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
