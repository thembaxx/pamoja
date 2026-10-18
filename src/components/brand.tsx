import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="Pamoja home">
      <img src="/icons/app-192.png" width={36} height={36} alt="" className="brand-icon" />
      <span>
        pamoja<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
