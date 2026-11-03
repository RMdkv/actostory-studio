import { cn } from "@/lib/utils";
import emblemAsset from "@/assets/acto-emblem.png.asset.json";

/** ACTO logo: the neon "A" medallion on black. Square artwork, scales with the width class passed in. */
export function ActoLogo({ className }: { className?: string }) {
  return (
    <img
      src={emblemAsset.url}
      alt="ACTO"
      width={1024}
      height={1024}
      className={cn("h-auto w-full rounded-[28%] ring-1 ring-primary/25 shadow-glow", className)}
    />
  );
}

/** Compact lockup for headers: the emblem followed by the ACTO name. */
export function ActoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src={emblemAsset.url}
        alt=""
        width={1024}
        height={1024}
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-primary/30"
      />
      <span className="font-display text-xl font-bold tracking-[0.18em] text-foreground">
        ACT<span className="text-primary">O</span>
      </span>
    </span>
  );
}
