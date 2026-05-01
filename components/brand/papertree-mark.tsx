export function PaperTreeMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid place-items-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-sm ${className}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(20,184,166,0.95),transparent_26%),linear-gradient(135deg,#0f172a_0%,#0f766e_100%)]" />
      <svg
        className="relative h-[72%] w-[72%]"
        fill="none"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 30c8.3-.9 13.2-4.7 15-11.5 1.1-4.3 3.9-7 8.7-7.9"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
        <path
          d="M14.8 16.2h18.4c2.2 0 4 1.8 4 4v13.6c0 2.2-1.8 4-4 4H14.8c-2.2 0-4-1.8-4-4V20.2c0-2.2 1.8-4 4-4Z"
          fill="rgba(255,255,255,0.92)"
          stroke="white"
          strokeWidth="2.2"
        />
        <path d="M16 23h13M16 28h10M16 33h7" stroke="#0f766e" strokeLinecap="round" strokeWidth="2.4" />
        <circle cx="36" cy="10.6" fill="#67e8f9" r="4.1" stroke="white" strokeWidth="2.2" />
        <circle cx="13" cy="30" fill="#14b8a6" r="3.6" stroke="white" strokeWidth="2.2" />
      </svg>
    </span>
  );
}
