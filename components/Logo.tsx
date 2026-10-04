import { site } from "@/content/site";

/** Compact wordmark for headers and footers. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-widest text-label ${className}`}>
      {site.brand.name.toUpperCase()}
    </span>
  );
}
