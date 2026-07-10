import React, { ReactNode } from 'react';
import { useContentProtectionConfig } from './ContentProtectionContext';
import { useContentProtection } from './useContentProtection';

export interface ContentProtectionProps {
  children: ReactNode;
  /**
   * If false, the wrapper class `react-content-protected` will not be applied.
   * By default, it is applied unless `allowCopy` is true.
   */
  isActive?: boolean;
}

export function ContentProtection({ children, isActive }: ContentProtectionProps) {
  // Setup all event listeners
  useContentProtection();
  const config = useContentProtectionConfig();
  
  const isDev = process.env.NODE_ENV === 'development';
  const shouldBypass = isDev && !config.enableInDevelopment;

  // Default logic: active if copy is not allowed and isActive isn't explicitly false
  // But force inactive if we should bypass in development
  let active = isActive !== undefined ? isActive : !config.allowCopy;
  if (shouldBypass) {
    active = false;
  }

  return (
    <div
      className={active ? 'react-content-protected' : ''}
      style={{
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {/* We inject user-select none via style if active */}
      {active && (
        <style dangerouslySetInnerHTML={{__html: `
          .react-content-protected {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          .react-content-protected img {
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
          }
        `}} />
      )}
      {children}
    </div>
  );
}
