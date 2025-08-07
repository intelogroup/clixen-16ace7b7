import React from 'react';
import { designTokens } from '../../styles/design-tokens';

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: keyof typeof designTokens.spacing;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'xl',
  padding = '4',
  className = '',
}) => {
  const maxWidthMap = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  };

  const containerStyles: React.CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
    margin: '0 auto',
    padding: `0 ${designTokens.spacing[padding]}`,
    width: '100%',
  };

  return (
    <div style={containerStyles} className={className}>
      {children}
    </div>
  );
};

export interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  spacing?: keyof typeof designTokens.spacing;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = '4',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
}) => {
  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };

  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  const stackStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: designTokens.spacing[spacing],
    alignItems: alignMap[align],
    justifyContent: justifyMap[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
  };

  return (
    <div style={stackStyles} className={className}>
      {children}
    </div>
  );
};

export interface SectionProps {
  children: React.ReactNode;
  padding?: keyof typeof designTokens.spacing;
  background?: 'white' | 'gray' | 'primary';
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  padding = '20',
  background = 'white',
  className = '',
}) => {
  const backgroundMap = {
    white: designTokens.colors.white,
    gray: designTokens.colors.gray[50],
    primary: designTokens.colors.primary[50],
  };

  const sectionStyles: React.CSSProperties = {
    padding: `${designTokens.spacing[padding]} 0`,
    backgroundColor: backgroundMap[background],
  };

  return (
    <section style={sectionStyles} className={className}>
      {children}
    </section>
  );
};

export default { Container, Stack, Section };