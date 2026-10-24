import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function ArrowUpRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

export function ArrowDownLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 5 11M10 11H5V6" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />
    </svg>
  );
}

export function ArrowUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function Warning(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2.8 14 13H2L8 2.8Z" />
      <path d="M8 6.6v3M8 11.4v.2" />
    </svg>
  );
}

export function Shield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2.2 13 4v4.2c0 2.5-2 4.6-5 5.6-3-1-5-3.1-5-5.6V4l5-1.8Z" />
      <path d="m6 8 1.5 1.5L10.4 6.6" />
    </svg>
  );
}

export function Terminal(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.2" y="3" width="11.6" height="10" rx="2" />
      <path d="m5.6 6.6 1.8 1.8-1.8 1.8M9 10.4h2" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 5.2A1.6 1.6 0 0 1 4.2 3.6h7.2a1.2 1.2 0 0 1 1.2 1.2v.4" />
      <rect x="2.6" y="5.2" width="10.8" height="7.2" rx="1.8" />
      <path d="M10.6 8.8h1.2" />
    </svg>
  );
}

export function Spinner({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.6" opacity="0.2" />
      <path
        d="M13.6 8A5.6 5.6 0 0 0 8 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.4 8.4 3 3L12.6 5" />
    </svg>
  );
}

export function Cross(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4.4 4.4 7.2 7.2M11.6 4.4l-7.2 7.2" />
    </svg>
  );
}
