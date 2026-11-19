import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-[44px] items-center gap-2.5 font-display text-xl font-extrabold">
      <span aria-hidden="true" className="inline-block h-9 w-9 rounded-full border-2 border-white bg-sun" />
      Let&apos;s meet!
    </Link>
  );
}
