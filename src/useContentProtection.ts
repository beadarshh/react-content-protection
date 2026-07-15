import { useEffect, useCallback } from 'react';
import { useContentProtectionConfig } from './ContentProtectionContext';

export function useContentProtection() {
  const config = useContentProtectionConfig();
  
  const canCopy = !!config.allowCopy;
  const canPrint = !!config.allowPrint;
  const canUseDevTools = !!config.allowDevTools;
  const canUseShortcuts = !!config.allowShortcuts;
  const canUseAutomated = !!config.allowAutomatedBrowsers;

  const isDev = process.env.NODE_ENV === 'development';
  const shouldBypass = isDev && !config.enableInDevelopment;

  // Block generic browser events (contextmenu, selectstart, dragstart, copy, cut)
  const blockEvent = useCallback((e: Event) => {
    if (shouldBypass || canCopy) return;
    e.preventDefault();
    return false;
  }, [canCopy]);

  // Block keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (shouldBypass) return;

    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (!canUseDevTools) {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Dev Tools shortcuts: Cmd/Ctrl + Shift + I/J/C
      if (cmdOrCtrl && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }
    }

    if (!canUseShortcuts) {
      // View Source: Cmd/Ctrl + U
      if (cmdOrCtrl && e.key.toUpperCase() === 'U') {
        e.preventDefault();
        return false;
      }
      
      // Select All, Copy, Cut, Save, Print
      if (cmdOrCtrl && ['A', 'C', 'X', 'S', 'P'].includes(e.key.toUpperCase())) {
        if (canCopy && ['A', 'C', 'X'].includes(e.key.toUpperCase())) return;
        if (canPrint && e.key.toUpperCase() === 'P') return;
        
        e.preventDefault();
        return false;
      }
      
      // PrintScreen
      if (e.key === 'PrintScreen') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText("");
        }
        alert('Screenshots are disabled on this platform.');
        return false;
      }
    }
  }, [canCopy, canPrint, canUseDevTools, canUseShortcuts, shouldBypass]);

  const detectDevTools = useCallback(() => {
    if (shouldBypass || canUseDevTools) return;

    const isIos = typeof navigator !== 'undefined' && (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
    const isMobile = typeof navigator !== 'undefined' && (/Android/i.test(navigator.userAgent) || isIos);
    if (isMobile) return;

    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;

    // If both thresholds are exceeded, it's highly likely to be a browser zoom rather than DevTools
    // DevTools usually only docks to one side (reducing only width OR height)
    if ((widthThreshold || heightThreshold) && !(widthThreshold && heightThreshold)) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-weight:800;color:red;background:#000;text-align:center;padding:20px;">ACCESS DENIED: DEVTOOLS DETECTED</div>';
    }

    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    if (end - start > 100) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-weight:800;color:red;background:#000;text-align:center;padding:20px;">ACCESS DENIED: DEBUGGER DETECTED</div>';
    }
  }, [canUseDevTools, shouldBypass]);

  useEffect(() => {
    if (shouldBypass) return;

    const isIosMobile = typeof navigator !== 'undefined' && (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
    if (isIosMobile) return;

    window.addEventListener('contextmenu', blockEvent);
    window.addEventListener('selectstart', blockEvent);
    window.addEventListener('dragstart', blockEvent);
    window.addEventListener('copy', blockEvent);
    window.addEventListener('cut', blockEvent);
    window.addEventListener('keydown', handleKeyDown);

    const handleBeforePrint = () => {
      if (!canPrint) {
        document.body.classList.add('react-content-protected-print');
        // Add a style tag directly to body if it doesn't exist
        if (!document.getElementById('react-content-protection-print-style')) {
          const style = document.createElement('style');
          style.id = 'react-content-protection-print-style';
          style.innerHTML = `
            @media print {
              body.react-content-protected-print {
                display: none !important;
              }
            }
          `;
          document.head.appendChild(style);
        }
      }
    };
    
    const handleAfterPrint = () => { 
      document.body.classList.remove('react-content-protected-print'); 
    };
    
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    let devToolsInterval: ReturnType<typeof setInterval> | undefined;
    let consoleInterval: ReturnType<typeof setInterval> | undefined;

    if (!canUseAutomated && typeof navigator !== 'undefined' && navigator.webdriver) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-weight:800;color:red;background:#000;text-align:center;padding:20px;">ACCESS DENIED: AUTOMATED BROWSER DETECTED</div>';
    }

    if (!canUseDevTools) {
      consoleInterval = setInterval(() => {
        console.clear();
        console.log('%cWARNING!', 'color: red; font-size: 40px; font-weight: bold;');
        console.log('%cUnauthorized console access is monitored and reported.', 'font-size: 18px;');
      }, 1000);
      
      devToolsInterval = setInterval(detectDevTools, 2000);
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.speak = () => {};
    }

    const handleSelection = () => {
      if (canCopy) return;
      const selection = window.getSelection();
      if (selection && selection.toString().length > 150) {
        selection.removeAllRanges();
      }
    };
    document.addEventListener('selectionchange', handleSelection);

    // Image protection is now handled via CSS in ContentProtection.tsx

    return () => {
      window.removeEventListener('contextmenu', blockEvent);
      window.removeEventListener('selectstart', blockEvent);
      window.removeEventListener('dragstart', blockEvent);
      window.removeEventListener('copy', blockEvent);
      window.removeEventListener('cut', blockEvent);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.removeEventListener('selectionchange', handleSelection);
      if (consoleInterval) clearInterval(consoleInterval);
      if (devToolsInterval) clearInterval(devToolsInterval);
    };
  }, [canCopy, canPrint, canUseAutomated, canUseDevTools, shouldBypass, blockEvent, handleKeyDown, detectDevTools]);
}
