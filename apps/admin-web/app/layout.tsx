import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import '@soliton/design-tokens/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Soliton Admin',
  description: 'Soliton platform management dashboard.',
};

// Props are declared structurally rather than via Next's generated global
// `LayoutProps<'/'>`. That global only exists once `next build` has written
// .next/types, so depending on it would make `pnpm typecheck` fail on a clean clone
// where nothing has been built yet. Next 15 made `params` a promise; this layout has
// no dynamic segments and does not read it, but the shape has to admit it.
interface RootLayoutProps {
  children: ReactNode;
  params?: Promise<Record<string, never>>;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
