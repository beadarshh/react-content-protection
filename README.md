# react-content-protection

A highly configurable React package to protect your web application's content by blocking copy/paste, right-clicks, printing, and developer tools.

## Installation

```bash
# If publishing to npm / GitHub
npm install react-content-protection
```

## Usage

Wrap your application or specific components in the `ContentProtectionProvider` to configure global settings, and then use the `ContentProtection` wrapper around the content you want to secure.

### Example

```tsx
import React from 'react';
import { ContentProtectionProvider, ContentProtection } from 'react-content-protection';

function App() {
  return (
    <ContentProtectionProvider 
      config={{
        allowCopy: false,
        allowPrint: false,
        allowDevTools: false,
        allowShortcuts: false,
        allowAutomatedBrowsers: false,
      }}
    >
      <ContentProtection>
        <div className="my-app">
          <h1>Secured Content</h1>
          <p>This text cannot be copied, right-clicked, or printed.</p>
        </div>
      </ContentProtection>
    </ContentProtectionProvider>
  );
}

export default App;
```

## Configuration Options

The `ContentProtectionProvider` accepts a `config` prop with the following boolean options:

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `allowCopy` | `boolean` | `false` | If `true`, allows text selection and copying. Overrides text selection blocks. |
| `allowPrint` | `boolean` | `false` | If `true`, allows printing the page. If `false`, the screen goes blank when trying to print. |
| `allowDevTools` | `boolean` | `false` | If `true`, disables active attempts to detect and block developer tools/debuggers. |
| `allowShortcuts` | `boolean` | `false` | If `true`, disables blocking of common shortcuts (Save `Ctrl+S`, Print `Ctrl+P`, View Source `Ctrl+U`, etc.). |
| `allowAutomatedBrowsers` | `boolean` | `false` | If `true`, disables the detection of automated browsers (like Selenium/Puppeteer). |
| `enableInDevelopment` | `boolean` | `false` | If `true`, the protection will run even when you are working locally (`npm run dev`). If `false`, the protection is disabled in dev mode to make coding easier. |

## Next.js (App Router) Setup

When using Next.js App Router (`app/`), the package works seamlessly. Since the `ContentProtectionProvider` uses React Hooks under the hood, you'll need to wrap it in a Client Component. The easiest way is to create a `providers.tsx` file:

```tsx
'use client';
// app/providers.tsx
import { ContentProtectionProvider, ContentProtection } from 'react-content-protection';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ContentProtectionProvider config={{ enableInDevelopment: true }}>
      <ContentProtection>
        {children}
      </ContentProtection>
    </ContentProtectionProvider>
  );
}
```

Then use it in your `layout.tsx`:

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Conditionally Enabling Protection

If you want to only enable protection for specific users (e.g., allow admins to copy but block regular users), you can pass a dynamic value to the `isActive` prop on `<ContentProtection>` or pass dynamic values to the `config` in the provider:

```tsx
function ConditionalProtection({ userRole }) {
  const isAdmin = userRole === 'admin';

  return (
    <ContentProtectionProvider config={{ allowCopy: isAdmin }}>
      <ContentProtection isActive={!isAdmin}>
        <div>Your content here</div>
      </ContentProtection>
    </ContentProtectionProvider>
  );
}
```
