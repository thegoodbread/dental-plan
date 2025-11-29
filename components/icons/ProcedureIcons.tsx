
import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const BaseIcon = ({ children, ...props }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const IconExam = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Dental Mirror */}
    <circle cx="12" cy="12" r="6" />
    <path d="M12 18V22" />
    <path d="M8 22H16" />
    <path d="M16 8L20 4" />
  </BaseIcon>
);

export const IconXray = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 5H21V19H3V5Z" />
    <path d="M8 9L12 15L16 9" />
    <path d="M3 13H21" />
  </BaseIcon>
);

export const IconFilling = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Tooth with filled spot */}
    <path d="M7 6C7 3 9 2 12 2C15 2 17 3 17 6C17 9 15 10 15 12V16C15 19 13 22 12 22C11 22 9 19 9 16V12C9 10 7 9 7 6Z" />
    <path d="M10 6H14V8H10V6Z" fill="currentColor" fillOpacity="0.2" stroke="none"/>
    <path d="M10 6H14V8H10V6Z" />
  </BaseIcon>
);

export const IconCrown = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Crown shape */}
    <path d="M5 16L3 8L8.5 10L12 4L15.5 10L21 8L19 16H5Z" />
    <path d="M5 16H19V19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V16Z" />
  </BaseIcon>
);

export const IconRootCanal = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Tooth with roots emphasized */}
    <path d="M7 4C7 2 9 2 12 2C15 2 17 2 17 4C17 7 15 9 15 10V14L17 22H14L13 16H11L10 22H7L9 14V10C9 9 7 7 7 4Z" />
    <path d="M12 5V15" />
    <path d="M12 15L10 20" />
    <path d="M12 15L14 20" />
  </BaseIcon>
);

export const IconImplant = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Screw / Fixture */}
    <path d="M12 2V6" />
    <path d="M9 6H15V10H9V6Z" />
    <path d="M10 10V22" />
    <path d="M14 10V22" />
    <path d="M10 14H14" />
    <path d="M10 18H14" />
    <path d="M7 2H17" />
  </BaseIcon>
);

export const IconExtraction = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Tooth moving up */}
    <path d="M7 10C7 7 9 6 12 6C15 6 17 7 17 10C17 13 15 14 15 16V20C15 23 13 22 12 22C11 22 9 23 9 20V16C9 14 7 13 7 10Z" opacity="0.5" />
    <path d="M12 2V12" />
    <path d="M9 5L12 2L15 5" />
  </BaseIcon>
);

export const IconPerio = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Gum line focus */}
    <path d="M4 12C4 16 8 19 12 19C16 19 20 16 20 12" />
    <path d="M7 7C7 5 8 4 10 4H14C16 4 17 5 17 7V12H7V7Z" />
    <path d="M2 12H22" strokeDasharray="2 2" />
    <path d="M12 14V22" />
  </BaseIcon>
);

export const IconDenture = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Arch shape */}
    <path d="M4 12C4 7 7 4 12 4C17 4 20 7 20 12" />
    <path d="M4 12V16C4 18 6 20 12 20C18 20 20 18 20 16V12" />
    <path d="M8 12V16" />
    <path d="M12 12V16" />
    <path d="M16 12V16" />
  </BaseIcon>
);

export const IconBridge = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Connected teeth */}
    <path d="M3 8H21" />
    <path d="M5 8V16C5 18 6 19 7 19H9C10 19 11 18 11 16V8" />
    <path d="M13 8V16C13 18 14 19 15 19H17C18 19 19 18 19 16V8" />
  </BaseIcon>
);

export const IconVeneer = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Shell */}
    <path d="M12 2C7 2 5 6 5 10V18C5 20 7 22 12 22C17 22 19 20 19 18V10C19 6 17 2 12 2Z" />
    <path d="M9 4C9 4 10 2 12 2C14 2 15 4 15 4" />
    <path d="M15 10C15 10 12 12 9 10" />
  </BaseIcon>
);

export const IconOrtho = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Brackets line */}
    <path d="M3 12H21" />
    <rect x="5" y="9" width="4" height="6" rx="1" />
    <rect x="15" y="9" width="4" height="6" rx="1" />
    <path d="M4 6C4 6 8 4 12 4C16 4 20 6 20 6" opacity="0.5" />
    <path d="M4 18C4 18 8 20 12 20C16 20 20 18 20 18" opacity="0.5" />
  </BaseIcon>
);

export const IconNightguard = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Guard outline */}
    <path d="M4 10C4 6 7 3 12 3C17 3 20 6 20 10V14C20 17 18 19 12 19C6 19 4 17 4 14V10Z" />
    <path d="M4 12H20" />
    <path d="M8 12V16" />
    <path d="M16 12V16" />
  </BaseIcon>
);

export const IconWhitening = (props: IconProps) => (
  <BaseIcon {...props}>
    {/* Sparkles */}
    <path d="M7 6C7 3 9 2 12 2C15 2 17 3 17 6C17 9 15 10 15 12V16C15 19 13 22 12 22C11 22 9 19 9 16V12C9 10 7 9 7 6Z" />
    <path d="M18 4L20 6L22 4" />
    <path d="M20 2V8" />
    <path d="M2 14L4 16L6 14" />
    <path d="M4 12V18" />
  </BaseIcon>
);
