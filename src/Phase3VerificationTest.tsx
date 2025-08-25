// src/Phase3VerificationTest.tsx
import React, { useState } from 'react';

// Header & Footer
const Header: React.FC = () => (
  <header className="bg-blue-900 text-white p-4">
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold">Football App</h1>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="bg-gray-800 text-white p-4 mt-8">
    <div className="container mx-auto text-center">
      <p>&copy; 2025 Football App. All rights reserved.</p>
    </div>
  </footer>
);

// Button Component
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  children,
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500',
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Badge Component
interface BadgeProps {
  variant?: 'success' | 'danger' | 'secondary' | 'warning';
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'secondary', className = '', children }) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        variantClasses[variant]
      } ${className}`}
    >
      {children}
    </span>
  );
};

// Card Component
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  title: string;
  action?: React.ReactNode;
}

interface CardBodyProps {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
} = ({ className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`}>{children}</div>
);

Card.Header = ({ title, action }) => (
  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {action}
  </div>
);

Card.Body = ({ children }) => <div className="p-6">{children}</div>;

// HeroSection placeholder
const HeroSection: React.FC<{
  onViewStats: () => void;
  onViewInsights: () => void;
}> = ({ onViewStats, onViewInsights }) => (
  <div className="p-4 border rounded mb-4">
    <p>Hero Section Placeholder</p>
    <div className="flex gap-2 mt-2">
      <Button onClick={onViewStats}>View Stats</Button>
      <Button onClick={onViewInsights} variant="secondary">
        View Insights
      </Button>
    </div>
  </div>
);

// Phase3VerificationTest Component
const Phase3VerificationTest: React.FC = () => {
  const [activeTest] = useState<string>('overview'); // removed unused setActiveTest
  const [heroResponsive, setHeroResponsive] = useState(false);

  const runTest = (testName: string, value: boolean) => {
    if (testName === 'heroResponsive') {
      setHeroResponsive(value);
    }
  };

  return (
    <>
      <Header />
      <main className="container mx-auto p-4">
        <Card className="mb-4">
          <Card.Header title="Phase 3 Verification Tests" />
          <Card.Body>
            {/* Hero Section */}
            <HeroSection
              onViewStats={() => console.log('View Stats clicked')}
              onViewInsights={() => console.log('View Insights clicked')}
            />

            {/* Responsive Test */}
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                onChange={(e) => runTest('heroResponsive', e.target.checked)}
                checked={heroResponsive}
              />
              Responsive design (try mobile width)
            </label>

            {/* Additional test cards / badges */}
            <Card className="mb-2">
              <Card.Header
                title="Test Card"
                action={<Badge variant="success">Passed</Badge>}
              />
              <Card.Body>
                Test details go here. Add more tests as needed.
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      </main>
      <Footer />
    </>
  );
};

export default Phase3VerificationTest;
