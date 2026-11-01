import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="SupportOps home">
      <span className="brand-mark" aria-hidden="true">
        S
      </span>
      <span>SupportOps</span>
    </Link>
  );
}
