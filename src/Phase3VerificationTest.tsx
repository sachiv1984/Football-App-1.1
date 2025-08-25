// src/Phase3VerificationTest.test.tsx
import React, { useState } from 'react';
import HeroSection from './HeroSection';
import FixtureCard from './FixtureCard';
import FixturesList from './FixturesList';
import LeagueTable from './LeagueTable';
import { Button, Card, Badge } from './UIComponents'; // assuming these are reusable

// Mock data
const mockFixtures = [ /* ...same as previous mockFixtures... */ ];
const mockLeagueData = [ /* ...same as previous mockLeagueData... */ ];

const Phase3VerificationTest: React.FC = () => {
  const [activeTest, setActiveTest] = useState('overview');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTest = (key: string, result: boolean) => {
    setTestResults(prev => ({ ...prev, [key]: result }));
  };

  const TestSection: React.FC<{ title: string; testKey: string; children: React.ReactNode }> = ({ title, testKey, children }) => (
    <Card className="mb-6">
      <Card.Header 
        title={title}
        action={
          <Badge variant={testResults[testKey] === true ? 'success' : testResults[testKey] === false ? 'danger' : 'secondary'}>
            {testResults[testKey] === true ? '✅ PASS' : testResults[testKey] === false ? '❌ FAIL' : '⏳ PENDING'}
          </Badge>
        }
      />
      <Card.Body>{children}</Card.Body>
    </Card>
  );

  const renderHeroTest = () => (
    <TestSection title="🏆 Hero Section Component Test" testKey="heroSection">
      <HeroSection 
        featuredFixture={mockFixtures[0]}
        onViewStats={() => runTest('heroSection', true)}
        onViewInsights={() => runTest('heroSection', true)}
      />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" onChange={e => runTest('heroBackground', e.target.checked)} />
          Football-themed background/styling
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" onChange={e => runTest('heroResponsive', e.target.checked)} />
          Responsive design (try mobile width)
       
