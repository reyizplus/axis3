/**
 * Animation Variants
 * Axis3 - Framer Motion Reusable Variants
 */

import { Variants } from 'framer-motion';

// Page transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Fade in/out
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale in/out
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

// Slide from bottom
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 50 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: { 
    opacity: 0, 
    y: 50,
    transition: {
      duration: 0.3,
    },
  },
};

// Stagger children
export const staggerContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// Card hover
export const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// Button press
export const buttonPressVariants = {
  rest: { scale: 1 },
  press: { scale: 0.95 },
};

// Glow effect
export const glowVariants = {
  rest: { 
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
  },
  hover: { 
    boxShadow: '0 0 30px rgba(37, 99, 235, 0.6)',
    transition: {
      duration: 0.3,
    },
  },
};
