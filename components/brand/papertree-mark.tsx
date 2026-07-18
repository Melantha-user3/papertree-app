import Image from "next/image";

export function PaperTreeMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-[22%] bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      <Image
        src="/papertree-app-icon.png"
        alt=""
        fill
        sizes="48px"
        className="object-cover"
        priority
      />
    </span>
  );
}
