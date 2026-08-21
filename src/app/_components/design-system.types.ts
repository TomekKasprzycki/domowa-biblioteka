export const ButtonVariant = {
  PRIMARY: "primary",
  GHOST: "ghost",
  OUTLINE_BLUE: "outline-blue",
  DECLINE: "decline",
} as const;

export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant];

export const ButtonSize = {
  DEFAULT: "default",
  SM: "sm",
} as const;

export type ButtonSize = (typeof ButtonSize)[keyof typeof ButtonSize];

export const PillTone = {
  ACTIVE: "active",
  PENDING: "pending",
  MINE: "mine",
} as const;

export type PillTone = (typeof PillTone)[keyof typeof PillTone];

export const LibraryCardTone = {
  DEFAULT: "default",
  PENDING_RETURN: "pending-return",
} as const;

export type LibraryCardTone = (typeof LibraryCardTone)[keyof typeof LibraryCardTone];
