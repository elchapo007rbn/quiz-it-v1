'use client';
import type { ReactNode } from 'react';
import { AURA_AVATAR } from '@/data/quizData';
import type { ZodiacSign } from '@/types/quiz';

/**
 * Chat primitives shared by steps 8, 9 and 11. The original ships the same
 * markup three times under different class prefixes (`chat-*`, `vm-*`) with
 * byte-identical rules, so one component covers both.
 */

function Avatar() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={AURA_AVATAR} alt="Maestra Aura" />;
}

export function ChatTyping() {
  return (
    <div className="chat-typing">
      <Avatar />
      <div className="chat-dots"><span /><span /><span /></div>
    </div>
  );
}

export function ChatBubble({ children }: { children: ReactNode }) {
  return (
    <div className="chat-bubble">
      <Avatar />
      <div className="chat-txt">{children}</div>
    </div>
  );
}

/** Right-aligned purple bubble echoing what the user just typed. */
export function ChatUserMsg({ text }: { text: string }) {
  return (
    <div className="chat-umsg">
      <span>{text}</span>
    </div>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="chat-pbc">
      <div className="chat-pbg">
        <div className="chat-pf" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Line-art constellation for the step-9 picker. */
export function ZodiacGlyph({ sign }: { sign: ZodiacSign }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {sign.shapes.map((shape, i) =>
        shape.t === 'path' ? (
          <path key={i} d={shape.d} />
        ) : (
          <circle
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            {...(shape.filled ? { fill: 'currentColor', stroke: 'none' } : {})}
          />
        )
      )}
    </svg>
  );
}
