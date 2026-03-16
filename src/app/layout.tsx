import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Immo3D – AI-Powered 3D Real Estate Visualization',
  description:
    'Upload building layouts and get fully furnished 3D models with interactive walkthroughs, AI-powered design suggestions, and export options.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0f1a] text-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
