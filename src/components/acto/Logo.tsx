import { cn } from "@/lib/utils";

/** Full ACTO logo (symbol + name), cropped from the artwork. */
export function ActoLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-[3/2] overflow-hidden", className)}>
      <img
        src="/Logotipo_futurista_ACTO_em_neon_verde.png"
        alt="ACTO"
        className="absolute left-1/2 top-1/2 w-[160%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/** Compact wordmark for headers. */
export function ActoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl font-bold tracking-[0.18em] text-foreground", className)}>
      ACT<span className="text-primary">O</span>
    </span>
  );
}
