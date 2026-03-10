import { useState } from 'react';

// Interactive mode: pass value (1–5) + onChange
// Read-only mode: pass value only (can be decimal for average display)
export default function StarRating({ value = 0, onChange, size = 24 }) {
  const [hovered, setHovered] = useState(null);
  const interactive = !!onChange;
  const display = hovered ?? value;

  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.floor(display);
        const half = !filled && i - 0.5 <= display;
        return (
          <span
            key={i}
            onClick={interactive ? () => onChange(i) : undefined}
            onMouseEnter={interactive ? () => setHovered(i) : undefined}
            onMouseLeave={interactive ? () => setHovered(null) : undefined}
            style={{
              fontSize: size,
              lineHeight: 1,
              cursor: interactive ? 'pointer' : 'default',
              color: filled ? '#FFB800' : half ? '#FFB800' : 'var(--border)',
              opacity: half ? 0.6 : 1,
              userSelect: 'none',
              transition: 'color 0.1s',
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
