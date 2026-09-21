// Design System: High-performance, Snappy Animation Tokens (iOS 18 / Linear style)
// Eliminates sluggish/floaty delays while maintaining fluid physics.

export const SPRING_SNAPPY = {
  type: 'spring',
  stiffness: 680,
  damping: 38,
  mass: 0.45
} as const;

export const SPRING_FAST = {
  type: 'spring',
  stiffness: 850,
  damping: 40,
  mass: 0.3
} as const;

export const SPRING_BOUNCE_SUBTLE = {
  type: 'spring',
  stiffness: 600,
  damping: 34,
  mass: 0.5
} as const;

// Quick exit to prevent AnimatePresence mode="wait" from blocking the next view
export const VIEW_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, transition: { duration: 0.06, ease: 'easeOut' } }
};

export const MODAL_TRANSITION = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: SPRING_SNAPPY },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.1, ease: 'easeOut' } }
};

export const DRAWER_TRANSITION = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: SPRING_SNAPPY },
  exit: { x: '-100%', transition: { duration: 0.15, ease: 'easeInOut' } }
};
