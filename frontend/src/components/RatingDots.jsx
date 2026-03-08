import { useState } from 'react';

export default function RatingDots({ value = null, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(null);

  const effective = hovered !== null ? hovered : value;

  return (
    <div
      className="rating"
      onMouseLeave={() => !readonly && setHovered(null)}
      title={value ? `Your rating: ${value}/10` : 'Rate this song'}
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          className={`rating__dot ${effective >= n ? 'rating__dot--filled' : ''} ${
            !readonly && hovered !== null && hovered >= n && !value ? 'rating__dot--hover' : ''
          }`}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
          aria-label={`Rate ${n} out of 10`}
          title={`${n}/10`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
