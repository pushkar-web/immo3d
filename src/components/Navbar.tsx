'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Menu, X, LogIn } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/settings', label: 'Settings' },
];

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname?.startsWith('/project/')) return null;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent
        ? 'bg-transparent'
        : 'glass shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
              transparent
                ? 'bg-gradient-to-br from-teal-400 to-teal-600'
                : 'bg-gradient-to-br from-primary-400 to-primary-600'
            }`}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold">
              <span className={transparent ? 'text-teal-400' : 'text-primary-600'}>Immo</span>
              <span className={transparent ? 'text-orange-400' : 'text-accent-500'}>3D</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? transparent
                      ? 'bg-white/10 text-teal-300'
                      : 'bg-primary-50 text-primary-700'
                    : transparent
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/upload"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
                transparent
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-400 hover:to-teal-500 shadow-teal-500/20'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-primary-500/20'
              }`}
            >
              Start Building
            </Link>
            <button className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              transparent
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}>
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg ${
              transparent
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t ${
          transparent
            ? 'border-white/10 bg-[#0a0f1a]/95 backdrop-blur-lg'
            : 'border-slate-200 bg-white/95 backdrop-blur-lg'
        }`}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? transparent
                      ? 'bg-white/10 text-teal-300'
                      : 'bg-primary-50 text-primary-700'
                    : transparent
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className={`pt-3 border-t ${transparent ? 'border-white/10' : 'border-slate-200'}`}>
              <Link
                href="/upload"
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium text-center ${
                  transparent
                    ? 'bg-teal-600 text-white'
                    : 'bg-primary-600 text-white'
                }`}
              >
                Start Building
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
