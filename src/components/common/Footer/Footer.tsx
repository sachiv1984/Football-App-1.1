import React from 'react';
import { Shield, ExternalLink, Twitter, Facebook, Instagram, Mail } from 'lucide-react';
import './Footer.module.css';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

interface FooterLink {
  label: string;
  path: string;
  external?: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const Footer: React.FC<FooterProps> = ({ 
  onNavigate = (path) => console.log(`Navigate to ${path}`) 
}) => {
  const quickLinks: FooterLink[] = [
    { label: 'Fixtures', path: '/fixtures' },
    { label: 'League Table', path: '/table' },
    { label: 'Statistics', path: '/stats' },
    { label: 'AI Insights', path: '/insights' }
  ];

  const legalLinks: FooterLink[] = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Cookie Policy', path: '/cookies' },
    { label: 'Contact Us', path: '/contact' }
  ];

  const responsibleGamblingLinks: FooterLink[] = [
    { label: 'BeGambleAware.org', path: 'https://www.begambleaware.org', external: true },
    { label: 'GamCare', path: 'https://www.gamcare.org.uk', external: true },
    { label: 'Gambling Commission', path: 'https://www.gamblingcommission.gov.uk', external: true }
  ];

  const socialLinks: SocialLink[] = [
    {
      platform: 'Twitter',
      url: 'https://twitter.com/footballstats',
      icon: <Twitter className="w-5 h-5" />,
      ariaLabel: 'Follow us on Twitter'
    },
    {
      platform: 'Facebook',
      url: 'https://facebook.com/footballstats',
      icon: <Facebook className="w-5 h-5" />,
      ariaLabel: 'Follow us on Facebook'
    },
    {
      platform: 'Instagram',
      url: 'https://instagram.com/footballstats',
      icon: <Instagram className="w-5 h-5" />,
      ariaLabel: 'Follow us on Instagram'
    },
    {
      platform: 'Email',
      url: 'mailto:hello@footballstats.com',
      icon: <Mail className="w-5 h-5" />,
      ariaLabel: 'Send us an email'
    }
  ];

  const handleLinkClick = (link: FooterLink): void => {
    if (link.external) {
      window.open(link.path, '_blank', 'noopener,noreferrer');
    } else {
      onNavigate(link.path);
    }
  };

  const handleSocialClick = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="bg-slate-900 text-gray-300 border-t-2 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-4">
                <div className="team-logo w-10 h-10 bg-gradient-to-br from-yellow-400 to-green-400 rounded-lg flex items-center justify-center font-bold text-slate-900 text-xl">
                  FS
                </div>
                <div className="ml-3 text-xl font-bold text-white">
                  Football<span className="text-gradient">Stats</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Your ultimate destination for football fixtures, statistics, and AI-powered betting insights. 
                Stay ahead of the game with real-time data and expert analysis.
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social) => (
                  <button
                    key={social.platform}
                    onClick={() => handleSocialClick(social.url)}
                    className="p-2 rounded-md bg-slate-800 text-gray-400 hover:bg-yellow-400 hover:text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label={social.ariaLabel}
                  >
                    {social.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <button
                      onClick={() => handleLinkClick(link)}
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.path}>
                    <button
                      onClick={() => handleLinkClick(link)}
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Responsible Gambling */}
            <div>
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-yellow-400" />
                Responsible Gambling
              </h3>
              <ul className="space-y-2">
                {responsibleGamblingLinks.map((link) => (
                  <li key={link.path}>
                    <button
                      onClick={() => handleLinkClick(link)}
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded flex items-center"
                    >
                      {link.label}
                      {link.external && (
                        <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Responsible Gambling Banner */}
        <div className="border-t border-slate-800 py-6">
          <div className="ai-insight-card bg-slate-800 rounded-lg p-4 border border-yellow-400/20">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-yellow-400 font-semibold text-sm mb-1">
                  18+ | Please Gamble Responsibly
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  This website provides betting insights for entertainment purposes only. 
                  Gambling can be addictive. Please play responsibly and seek help if needed.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleLinkClick({ label: 'BeGambleAware.org', path: 'https://www.begambleaware.org', external: true })}
                    className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                  >
                    BeGambleAware.org
                  </button>
                  <span className="text-gray-500">•</span>
                  <button
                    onClick={() => handleLinkClick({ label: 'GamCare Support', path: 'https://www.gamcare.org.uk', external: true })}
                    className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                  >
                    GamCare Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-2 md:mb-0">
              © {new Date().getFullYear()} FootballStats. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span>Powered by AI Insights</span>
              <span className="hidden md:inline">•</span>
              <span>Real-time Data</span>
              <span className="hidden md:inline">•</span>
              <span>Expert Analysis</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
