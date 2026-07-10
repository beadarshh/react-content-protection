import React, { createContext, useContext, ReactNode } from 'react';

export interface ContentProtectionConfig {
  /**
   * If true, allows copying text and images. Overrides text selection block.
   * Default: false
   */
  allowCopy?: boolean;

  /**
   * If true, allows printing the page without a protection overlay.
   * Default: false
   */
  allowPrint?: boolean;

  /**
   * If true, does not actively attempt to detect/block developer tools.
   * Default: false
   */
  allowDevTools?: boolean;

  /**
   * If true, does not block common shortcuts (Save, Print, View Source, etc.).
   * Default: false
   */
  allowShortcuts?: boolean;

  /**
   * If true, disables the 'Automated Browser Detected' check.
   * Default: false
   */
  allowAutomatedBrowsers?: boolean;

  /**
   * If true, the content protection will be active even during development mode.
   * If false, all protections are bypassed when process.env.NODE_ENV === 'development'.
   * Default: false
   */
  enableInDevelopment?: boolean;
}

const defaultConfig: ContentProtectionConfig = {
  allowCopy: false,
  allowPrint: false,
  allowDevTools: false,
  allowShortcuts: false,
  allowAutomatedBrowsers: false,
  enableInDevelopment: false,
};

const ContentProtectionContext = createContext<ContentProtectionConfig>(defaultConfig);

export function ContentProtectionProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Partial<ContentProtectionConfig>;
}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return (
    <ContentProtectionContext.Provider value={mergedConfig}>
      {children}
    </ContentProtectionContext.Provider>
  );
}

export function useContentProtectionConfig() {
  return useContext(ContentProtectionContext);
}
