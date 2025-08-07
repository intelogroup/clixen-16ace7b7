// Design System Tokens for MVP Consistency
// Simple, professional design system focusing on usability and consistency

export const designTokens = {
  // Color System - Professional and minimal
  colors: {
    // Primary brand colors - consistent purple theme
    primary: {
      50: '#f8f7ff',
      100: '#f0edff', 
      500: '#8b5cf6',  // Main purple
      600: '#7c3aed',  // Darker purple for hover
      700: '#6d28d9',  // Dark purple
      900: '#4c1d95',  // Very dark
    },
    
    // Neutral grays - simplified palette
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6', 
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Semantic colors
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
    },
    
    // Pure colors for high contrast
    white: '#ffffff',
    black: '#000000',
  },

  // Typography Scale - Clear hierarchy
  typography: {
    // Font sizes with clear purpose
    sizes: {
      xs: '0.75rem',    // 12px - captions, fine print
      sm: '0.875rem',   // 14px - body small, labels
      base: '1rem',     // 16px - body text
      lg: '1.125rem',   // 18px - large body
      xl: '1.25rem',    // 20px - small headings
      '2xl': '1.5rem',  // 24px - headings
      '3xl': '1.875rem', // 30px - large headings
      '4xl': '2.25rem', // 36px - hero text
    },
    
    // Font weights
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Line heights
    leading: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // Spacing Scale - Consistent rhythm
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px - base unit
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.125rem',    // 2px
    default: '0.25rem', // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
} as const;

// Component-specific token helpers
export const buttonTokens = {
  // Button variants using design tokens
  variants: {
    primary: {
      bg: designTokens.colors.primary[500],
      bgHover: designTokens.colors.primary[600],
      text: designTokens.colors.white,
      border: designTokens.colors.primary[500],
    },
    secondary: {
      bg: designTokens.colors.gray[100],
      bgHover: designTokens.colors.gray[200],
      text: designTokens.colors.gray[700],
      border: designTokens.colors.gray[200],
    },
    ghost: {
      bg: 'transparent',
      bgHover: designTokens.colors.gray[100],
      text: designTokens.colors.gray[600],
      border: 'transparent',
    },
    danger: {
      bg: designTokens.colors.error[500],
      bgHover: designTokens.colors.error[600],
      text: designTokens.colors.white,
      border: designTokens.colors.error[500],
    },
  },
  
  // Button sizes
  sizes: {
    sm: {
      padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
      fontSize: designTokens.typography.sizes.sm,
      radius: designTokens.radius.md,
    },
    md: {
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.sizes.base,
      radius: designTokens.radius.lg,
    },
    lg: {
      padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
      fontSize: designTokens.typography.sizes.lg,
      radius: designTokens.radius.xl,
    },
  },
};

// Form element tokens
export const formTokens = {
  input: {
    bg: designTokens.colors.white,
    border: designTokens.colors.gray[200],
    borderFocus: designTokens.colors.primary[500],
    text: designTokens.colors.gray[900],
    placeholder: designTokens.colors.gray[400],
    padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
    radius: designTokens.radius.lg,
  },
};