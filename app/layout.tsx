import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';

const sans = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const serif = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'JeevanPatra — Beautiful Marriage Biodata',
  description:
    'Create a beautiful, personalized marriage biodata with handcrafted templates and thoughtful AI assistance.',
  openGraph: {
    title: 'JeevanPatra — Your story, beautifully told',
    description: 'Create an elegant marriage biodata with handcrafted templates and thoughtful AI.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'JeevanPatra — Your story, beautifully told' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JeevanPatra — Your story, beautifully told',
    description: 'Create an elegant marriage biodata with handcrafted templates and thoughtful AI.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
