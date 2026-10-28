import React from 'react';

interface PageContainerProps {
  /** Narrow pages (forms, details) read better at a shorter line length. */
  width?: 'default' | 'narrow';
  className?: string;
  children: React.ReactNode;
}

/** Page body below the PageHeader: centred, with the app's standard gutters. */
export function PageContainer({ width = 'default', className = '', children }: PageContainerProps) {
  return (
    <div className={`mx-auto px-5 py-6 lg:px-10 lg:py-8 ${width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl'} ${className}`}>
      {children}
    </div>);

}
