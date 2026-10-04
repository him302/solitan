import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import '@soliton/design-tokens/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Soliton Admin',
  description: 'Soliton platform management dashboard.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
