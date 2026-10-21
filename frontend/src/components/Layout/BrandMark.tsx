/** Paired gold ticket stubs — punched perforations, clean stub edge. */
export default function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="7" fill="#0d0203" />

      {/* Back ticket */}
      <g transform="rotate(15 18.5 16.5)">
        <rect x="9" y="10.5" width="16.5" height="11" rx="1.4" fill="#a8862e" />
        {/* Edge notches + punch holes (through to cinema black) */}
        <circle cx="12.6" cy="10.5" r="1.35" fill="#0d0203" />
        <circle cx="12.6" cy="21.5" r="1.35" fill="#0d0203" />
        <circle cx="12.6" cy="13.3" r="0.75" fill="#0d0203" />
        <circle cx="12.6" cy="16" r="0.75" fill="#0d0203" />
        <circle cx="12.6" cy="18.7" r="0.75" fill="#0d0203" />
      </g>

      {/* Front ticket */}
      <g transform="rotate(-12 14.5 15.5)">
        <rect x="5.5" y="9.5" width="18" height="12" rx="1.4" fill="#e6c567" />
        {/* Top/bottom bite notches on the tear line */}
        <circle cx="9.6" cy="9.5" r="1.4" fill="#0d0203" />
        <circle cx="9.6" cy="21.5" r="1.4" fill="#0d0203" />
        {/* Perforation punches */}
        <circle cx="9.6" cy="12.5" r="0.8" fill="#0d0203" />
        <circle cx="9.6" cy="15.5" r="0.8" fill="#0d0203" />
        <circle cx="9.6" cy="18.5" r="0.8" fill="#0d0203" />
        {/* Star centered in the main stub body (right of perforations) */}
        <path
          fill="#0d0203"
          opacity="0.72"
          d="M16.55 11.95l.85 2.55h2.7l-2.2 1.55.85 2.55-2.2-1.55-2.2 1.55.85-2.55-2.2-1.55h2.7l.85-2.55Z"
        />
      </g>
    </svg>
  );
}
