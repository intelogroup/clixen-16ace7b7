// Minimal Light Theme Design System
// Ultra-clean, minimal design focusing on simplicity and readability

export const designTokens = {
  // Color System - Minimal light theme
  colors: {
    // Primary brand colors - soft blue-gray
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9', 
      500: '#64748b',  // Main slate
      600: '#475569',  // Darker slate for hover  
      700: '#334155',  // Dark slate
      900: '#0f172a',  // Very dark
    },
    
    // Neutral grays - ultra minimal
    gray: {
      50: '#fefefe',
      100: '#f8f9fa', 
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#adb5bd',
      500: '#6c757d',
      600: '#495057',
      700: '#343a40',
      800: '#212529',
      900: '#121212',
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