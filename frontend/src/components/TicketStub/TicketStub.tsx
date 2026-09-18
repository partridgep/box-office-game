import { ReactNode } from "react";

interface TicketStubProps {
  children: ReactNode;
  className?: string;
  /** Compact title-chip variant (no watermark, tighter padding). */
  compact?: boolean;
  watermark?: string;
  footer?: string;
}

export default function TicketStub({
  children,
  className = "",
  compact = false,
  watermark = "R",
  footer,
}: TicketStubProps) {
  return (
    <div
      className={[
        "ticket-stub relative overflow-visible font-ticketing text-ticket-ink",
        compact ? "ticket-stub--compact px-4 py-3" : "px-5 py-6 pl-7",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!compact && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11rem] leading-none opacity-[0.12] rotate-90 select-none"
          aria-hidden
        >
          {watermark}
        </span>
      )}

      <div className="relative z-10">{children}</div>

      {footer && !compact && (
        <p
          className="relative z-10 mt-5 pt-3 border-t border-ticket-ink/25 text-[10px] tracking-[0.2em] uppercase text-ticket-ink/70 truncate"
          aria-hidden
        >
          {footer}
        </p>
      )}
    </div>
  );
}
