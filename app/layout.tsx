import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talasco Kitchen',
  description: 'Kitchen AI Frontend'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}



