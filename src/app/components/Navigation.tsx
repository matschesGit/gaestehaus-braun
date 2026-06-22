"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-[#d8c8b4] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-[#1f6f61]">
          Gästehaus Braun
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/" className="text-[#2f241d] hover:text-[#1f6f61] transition-colors">
            Startseite
          </Link>
          <Link href="/#apartments" className="text-[#2f241d] hover:text-[#1f6f61] transition-colors">
            Unterkünfte
          </Link>
          <Link href="/about" className="text-[#2f241d] hover:text-[#1f6f61] transition-colors">
            Über uns
          </Link>
          <Link href="/agb" className="text-[#2f241d] hover:text-[#1f6f61] transition-colors">
            AGB
          </Link>
          <Link href="/impressum" className="text-[#2f241d] hover:text-[#1f6f61] transition-colors">
            Impressum
          </Link>
          <a href="mailto:info@gaestehaus-braun.de" className="bg-[#1f6f61] text-white px-4 py-2 rounded hover:bg-[#186b5f] transition-colors">
            Kontakt
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-[#f4efe7] rounded"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#d8c8b4] bg-white">
          <div className="px-4 py-4 space-y-2">
            <Link href="/" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              Startseite
            </Link>
            <Link href="/#apartments" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              Unterkünfte
            </Link>
            <Link href="/about" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              Über uns
            </Link>
            <Link href="/agb" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              AGB
            </Link>
            <Link href="/impressum" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              Impressum
            </Link>
            <a href="mailto:info@gaestehaus-braun.de" className="block text-[#2f241d] hover:text-[#1f6f61] py-2">
              Kontakt
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
