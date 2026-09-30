import React from 'react';

interface ScreenFitContainerProps {
  children: React.ReactNode;
  idealHeight?: number;
  idealWidth?: number;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

/**
 * ScreenFitContainer
 * 
 * Provides a robust, full-bleed container that ensures dashboard pages
 * fill 100% of the available workspace without horizontal displacement
 * or unwanted vertical scrollbars.
 */
export const ScreenFitContainer: React.FC<ScreenFitContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`w-full h-full flex flex-col min-h-0 overflow-hidden ${className}`}>
      {children}
    </div>
  );
};
