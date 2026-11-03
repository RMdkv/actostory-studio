import welcomeAsset from "@/assets/acto-welcome.webp.asset.json";

/**
 * Dashboard welcome banner: "Olá, atleta!" over the neon ACTO identity.
 * The artwork is 1920x640 and is rendered at full width with its ratio kept,
 * so it never stretches or gets cut.
 */
export function WelcomeBanner({ className }: { className?: string }) {
  return (
    <img
      src={welcomeAsset.url}
      alt="Olá, atleta! Bem-vindo de volta à ACTO"
      width={1920}
      height={640}
      className={className}
      loading="eager"
    />
  );
}
