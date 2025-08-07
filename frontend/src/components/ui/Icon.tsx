import React from 'react';
import { LucideIcon } from 'lucide-react';
import { designTokens } from '../../styles/design-tokens';

export interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'inherit';
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  color = 'inherit',
  className = '',
}) => {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const colorMap = {
    primary: designTokens.colors.primary[500],
    secondary: designTokens.colors.gray[600],
    success: designTokens.colors.success[500],
    error: designTokens.colors.error[500],
    warning: designTokens.colors.warning[500],
    inherit: 'currentColor',
  };

  const iconStyles: React.CSSProperties = {
    color: colorMap[color],
    width: `${sizeMap[size]}px`,
    height: `${sizeMap[size]}px`,
    flexShrink: 0,
  };

  return (
    <IconComponent
      style={iconStyles}
      className={className}
    />
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: IconComponent,
  size = 'md',
  variant = 'ghost',
  color = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeMap = {
    sm: { button: '32px', icon: 16 },
    md: { button: '40px', icon: 20 },
    lg: { button: '48px', icon: 24 },
  };

  const getVariantStyles = () => {
    const colorTokens = {
      primary: designTokens.colors.primary,
      secondary: designTokens.colors.gray,
      success: designTokens.colors.success,
      error: designTokens.colors.error,
      warning: designTokens.colors.warning,
    };

    const colors = colorTokens[color];

    switch (variant) {
      case 'solid':
        return {
          backgroundColor: colors[500],
          color: designTokens.colors.white,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: colors[500],
          border: `1px solid ${colors[500]}`,
        };
      case 'ghost':
      default:
        return {
          backgroundColor: 'transparent',
          color: colors[500],
          border: 'none',
        };
    }
  };

  const buttonStyles: React.CSSProperties = {
    ...getVariantStyles(),
    width: sizeMap[size].button,
    height: sizeMap[size].button,
    borderRadius: designTokens.radius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
  };

  return (
    <button
      style={buttonStyles}
      className={`hover:opacity-80 focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin"
          width={sizeMap[size].icon}
          height={sizeMap[size].icon}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <IconComponent
          width={sizeMap[size].icon}
          height={sizeMap[size].icon}
        />
      )}
    </button>
  );
};

export default { Icon, IconButton };