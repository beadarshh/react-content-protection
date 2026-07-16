import { useEffect, useCallback, useRef } from 'react';
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

  // Timestamp of the last viewport resize/zoom/orientation event. Used to
  // give the debugger-timing check a short cooldown after any of these,
  // since they cause legitimate main-thread layout/paint work that looks
  // identical to a paused debugger if you only measure elapsed time.
  const lastViewportChangeRef = useRef(0);
  // Consecutive over-threshold hit counter. A real attached debugger stays
  // paused, so it trips this on back-to-back 2s ticks. A one-off jank spike
  // (GC pause, layout thrash, pinch-zoom reflow) resets the streak instead
  // of firing immediately.
  const suspiciousStreakRef = useRef(0);

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

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    // --- Skip mobile/tablet devices (iOS, Android) ---
    const isIos = typeof navigator !== 'undefined' && (
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (ua.includes('Mac') && 'ontouchend' in document)
    );
    const isMobile = typeof navigator !== 'undefined' && (/Android/i.test(ua) || isIos);
    if (isMobile) return;

    // --- Skip ALL macOS desktop/laptop browsers ---
    // Anything reaching this line has already failed the isIos check above,
    // so it is guaranteed NOT to be an iPad spoofing as a Mac. That means we
    // no longer need — and must NOT use — maxTouchPoints to gate this.
    //
    // Previous version required `maxTouchPoints <= 1` here. MacBook
    // trackpads are physically multi-touch surfaces (that's how
    // pinch-to-zoom works), and on some macOS/Safari combinations they
    // report maxTouchPoints as 2+ even though there's no touchscreen. That
    // caused real Macs to fail this check, fall through to the
    // debugger-timing test below, and get falsely flagged mid pinch-zoom —
    // exactly when Safari's layout/paint work is busiest.
    const isMacDesktop = ua.includes('Macintosh');
    if (isMacDesktop) return;

    // --- Skip if the viewport changed very recently (resize/zoom/orientation) ---
    // Belt-and-suspenders for every platform, not just Mac: any of these
    // can legitimately stall the main thread for 100ms+ via layout/paint,
    // which is indistinguishable from a debugger pause if you only look at
    // elapsed time.
    if (Date.now() - lastViewportChangeRef.current < 1500) return;

    // --- For non-Mac desktops (Windows, Linux): debugger timing check ---
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();

    if (end - start > 150) {
      suspiciousStreakRef.current += 1;
    } else {
      suspiciousStreakRef.current = 0;
    }

    // Require two consecutive hits (~4s apart, since this runs every 2s)
    // before acting.
    if (suspiciousStreakRef.current >= 2) {
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

    // Track viewport changes (resize, pinch-zoom, orientation) so the
    // debugger-timing check can give itself a brief cooldown afterward.
    const markViewportChange = () => {
      lastViewportChangeRef.current = Date.now();
    };
    window.addEventListener('resize', markViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', markViewportChange);
      window.visualViewport.addEventListener('scroll', markViewportChange);
    }

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
      window.speechSynthesis.speak = () => { };
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
      window.removeEventListener('resize', markViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', markViewportChange);
        window.visualViewport.removeEventListener('scroll', markViewportChange);
      }
      document.removeEventListener('selectionchange', handleSelection);
      if (consoleInterval) clearInterval(consoleInterval);
      if (devToolsInterval) clearInterval(devToolsInterval);
    };
  }, [canCopy, canPrint, canUseAutomated, canUseDevTools, shouldBypass, blockEvent, handleKeyDown, detectDevTools]);
}