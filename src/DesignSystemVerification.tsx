import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
{progress === 100 && (
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="font-semibold text-green-800">🎉 Phase 1 Complete!</p>
            <p className="text-sm text-green-700 mt-1">
              All setup items verified. You're ready to move on to Phase 2: Core Features.
            </p>
          </div>
        )}

const Phase1Verification = () => {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const ChecklistItem = ({ id, title, description, status = 'pending', commands = [] }) => {
    const isChecked = checkedItems[id];
    
    const statusIcons = {
      verified: <CheckCircle className="w-5 h-5 text-green-500" />,
      warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      pending: <div className="w-5 h-5 border-2 border-gray-300 rounded" />
    };

    return (
      <div className={`p-4 border rounded-lg transition-all duration-200 ${
        isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleCheck(id)}
            className="mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {isChecked ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              statusIcons[status]
            )}
          </button>
          
          <div className="flex-1">
            <h3 className={`font-semibold ${isChecked ? 'text-green-800' : 'text-gray-900'}`}>
              {title}
            </h3>
            <p className={`text-sm mt-1 ${isChecked ? 'text-green-700' : 'text-gray-600'}`}>
              {description}
            </p>
            
            {commands.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Run these commands to verify:</p>
                {commands.map((command, index) => (
                  <code key={index} className="block text-xs bg-gray-800 text-green-400 p-2 rounded mb-1 font-mono">
                    {command}
                  </code>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const setupItems = [
    {
      id: 'repo',
      title: 'GitHub Repository',
      description: 'Repository created with proper README.md and .gitignore',
      status: 'verified',
      commands: ['git remote -v', 'ls -la | grep -E "(README|gitignore)"']
    },
    {
      id: 'dependencies',
      title: 'Project Dependencies',
      description: 'All required npm packages installed correctly',
      status: 'pending',
      commands: ['npm list react react-dom typescript', 'npm list @types/react @types/node']
    },
    {
      id: 'design-tokens',
      title: 'Design Tokens System',
      description: 'designTokens.ts with brand colors, typography, spacing - fully TypeScript typed',
      status: 'verified',
      commands: ['cat src/styles/designTokens.ts | grep -E "(colors|typography)"']
    },
    {
      id: 'tailwind',
      title: 'Tailwind CSS Configuration',
      description: 'Tailwind configured with custom brand colors (electric-yellow, deep-blue, etc.)',
      status: 'verified',
      commands: ['npx tailwindcss --help', 'grep -E "electric-yellow|deep-blue" tailwind.config.js']
    },
    {
      id: 'typescript',
      title: 'TypeScript Configuration',
      description: 'tsconfig.json properly configured for React',
      status: 'pending',
      commands: ['npx tsc --noEmit', 'cat tsconfig.json']
    },
    {
      id: 'button-component',
      title: 'Button Component (5 variants, 4 sizes)',
      description: 'Complete Button with primary/secondary/outline/ghost/danger + loading/icons/disabled states',
      status: 'verified',
      commands: ['grep -E "variant|size|loading" src/components/common/Button/Button.tsx']
    },
    {
      id: 'card-component',
      title: 'Card Component (Compound Pattern)',
      description: 'Card.Header, Card.Body, Card.Footer with variants and hover effects',
      status: 'verified',
      commands: ['grep -E "Card\." src/components/common/Card/Card.tsx']
    },
    {
      id: 'badge-component',
      title: 'Badge Component (7 variants)',
      description: 'Including dot badges, removable badges, and brand color variants',
      status: 'verified',
      commands: ['grep -E "removable|dot|variant" src/components/common/Badge/Badge.tsx']
    },
    {
      id: 'table-component',
      title: 'Table Component (Sorting & Responsive)',
      description: 'Full-featured table with sorting, hover, striped rows, loading states',
      status: 'verified',
      commands: ['grep -E "sortable|hover|loading" src/components/common/Table/Table.tsx']
    },
    {
      id: 'modal-component',
      title: 'Modal Component (Compound + A11y)',
      description: 'Modal with Header/Body/Footer, keyboard navigation, overlay close',
      status: 'verified',
      commands: ['grep -E "useEffect|Escape|onClose" src/components/common/Modal/Modal.tsx']
    },
    {
      id: 'global-css',
      title: 'Enhanced Global CSS (60+ utilities)',
      description: 'Football-specific classes, animations, responsive helpers, form components',
      status: 'verified',
      commands: ['grep -E "fixture-card|team-logo|animate-" src/styles/globals.css', 'wc -l src/styles/globals.css']
    },
    {
      id: 'export-system',
      title: 'Central Export System',
      description: 'index.ts files for easy imports, TypeScript types exported, utility functions',
      status: 'verified',
      commands: ['cat src/components/index.ts', 'find src -name "index.ts" | wc -l']
    },
    {
      id: 'build',
      title: 'Build Process',
      description: 'Project builds successfully without errors',
      status: 'pending',
      commands: ['npm run build', 'npm run type-check']
    },
    {
      id: 'linting',
      title: 'ESLint Configuration',
      description: 'ESLint configured and running without errors',
      status: 'verified',
      commands: ['npx eslint --version', 'npm run lint']
    },
    {
      id: 'dev-server',
      title: 'Development Server',
      description: 'Dev server starts and components render correctly',
      status: 'pending',
      commands: ['npm run dev', 'npm start']
    }
  ];

  const verifiedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = setupItems.length;
  const progress = (verifiedCount / totalCount) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Phase 1: Setup Verification Checklist
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Progress Overview</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-blue-700">
              {verifiedCount}/{totalCount} verified
            </span>
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Already verified from your files</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>Needs manual verification</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {setupItems.map(item => (
          <ChecklistItem key={item.id} {...item} />
        ))}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">🎯 Phase 1 Summary - What's Been Built</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">✅ Design System Core</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Design tokens with brand colors</li>
              <li>• 5 complete components</li>
              <li>• 60+ CSS utility classes</li>
              <li>• TypeScript types throughout</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">⚡ Ready-to-Use Features</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Football-specific CSS classes</li>
              <li>• Responsive design helpers</li>
              <li>• Animation utilities</li>
              <li>• Form components</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🔧 Final Verification Steps</h4>
          
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-blue-800 mb-1">Step 1: Build Verification</h5>
              <code className="block text-xs bg-blue-900 text-blue-100 p-2 rounded font-mono mb-2">
                npm install && npm run build
              </code>
              <p className="text-xs text-blue-700">
                ✅ <strong>Expected:</strong> "Build completed successfully" or similar message<br/>
                ❌ <strong>If errors:</strong> Check for missing dependencies or TypeScript issues
              </p>
            </div>

            <div>
              <h5 className="font-medium text-blue-800 mb-1">Step 2: Dev Server Test</h5>
              <code className="block text-xs bg-blue-900 text-blue-100 p-2 rounded font-mono mb-2">
                npm run dev  # or npm start
              </code>
              <p className="text-xs text-blue-700">
                ✅ <strong>Expected:</strong> "Local: http://localhost:3000" (or similar port)<br/>
                ✅ <strong>Expected:</strong> Browser opens automatically or manual visit works<br/>
                ❌ <strong>If errors:</strong> Check port conflicts or missing files
              </p>
            </div>

            <div>
              <h5 className="font-medium text-blue-800 mb-1">Step 3: Component Test (Detailed Guide Below)</h5>
              <p className="text-xs text-blue-700">
                Create a test page to verify your design system components render with correct styling
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">📋 Step-by-Step Component Testing</h4>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-green-800">1. Create test file:</span>
              <code className="block text-xs bg-green-900 text-green-100 p-2 rounded font-mono mt-1">
                src/ComponentTest.tsx
              </code>
            </div>

            <div>
              <span className="font-medium text-green-800">2. Add this test code:</span>
              <code className="block text-xs bg-green-900 text-green-100 p-3 rounded font-mono mt-1 whitespace-pre">
{`import React from 'react';
import { Button, Card, Badge, Table, Modal } from './components';

const ComponentTest = () => {
  const [showModal, setShowModal] = React.useState(false);
  
  const sampleData = [
    { name: 'Arsenal', points: 50, wins: 15 },
    { name: 'Man City', points: 48, wins: 14 },
  ];
  
  const columns = [
    { key: 'name', title: 'Team', dataIndex: 'name' },
    { key: 'points', title: 'Points', dataIndex: 'points' },
    { key: 'wins', title: 'Wins', dataIndex: 'wins' },
  ];

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Design System Test
      </h1>
      
      {/* Button Tests */}
      <Card className="p-6">
        <Card.Header title="Button Component Test" />
        <Card.Body>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Primary (Electric Yellow)</Button>
            <Button variant="secondary">Secondary (Deep Blue)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex gap-4 flex-wrap mt-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
          </div>
        </Card.Body>
      </Card>

      {/* Badge Tests */}
      <Card className="p-6">
        <Card.Header title="Badge Component Test" />
        <Card.Body>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="primary">Primary Badge</Badge>
            <Badge variant="secondary">Secondary Badge</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge dot variant="success" />
            <Badge removable onRemove={() => alert('Remove clicked')}>
              Removable
            </Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Table Test */}
      <Card className="p-6">
        <Card.Header title="Table Component Test" />
        <Card.Body>
          <Table 
            data={sampleData} 
            columns={columns}
            hover
            striped
            sortable
          />
        </Card.Body>
      </Card>

      {/* Modal Test */}
      <Card className="p-6">
        <Card.Header title="Modal Component Test" />
        <Card.Body>
          <Button onClick={() => setShowModal(true)}>
            Open Modal
          </Button>
          <Modal 
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Test Modal"
          >
            <Modal.Body>
              This modal should have your brand styling!
            </Modal.Body>
            <Modal.Footer>
              <Button 
                variant="ghost" 
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary">
                Confirm
              </Button>
            </Modal.Footer>
          </Modal>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ComponentTest;`}
              </code>
            </div>

            <div>
              <span className="font-medium text-green-800">3. Import and use in App.tsx:</span>
              <code className="block text-xs bg-green-900 text-green-100 p-2 rounded font-mono mt-1">
{`import ComponentTest from './ComponentTest';

function App() {
  return <ComponentTest />;
}`}
              </code>
            </div>

            <div>
              <span className="font-medium text-green-800">4. Check these visual elements:</span>
              <ul className="text-xs text-green-700 mt-1 space-y-1 ml-4">
                <li>✅ Primary button should be <strong>electric yellow (#FFFF00)</strong></li>
                <li>✅ Secondary button should be <strong>deep blue (#003366)</strong></li>
                <li>✅ Cards have proper shadows and rounded corners</li>
                <li>✅ Table has hover effects and proper spacing</li>
                <li>✅ Modal opens/closes correctly with overlay</li>
                <li>✅ Typography uses Poppins for headings, Inter for body</li>
                <li>✅ No console errors in browser dev tools</li>
              </ul>
            </div>

            <div>
              <span className="font-medium text-green-800">5. Football-specific CSS test:</span>
              <code className="block text-xs bg-green-900 text-green-100 p-2 rounded font-mono mt-1">
{`<div className="fixture-card">
  <div className="flex items-center gap-4">
    <div className="team-logo-lg bg-red-500 rounded-full"></div>
    <span className="match-score">2-1</span>
    <div className="team-logo-lg bg-blue-500 rounded-full"></div>
  </div>
</div>`}
              </code>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Files to Check</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>• <code>package.json</code> - Verify all dependencies are listed</p>
          <p>• <code>tsconfig.json</code> - Ensure TypeScript is properly configured</p>
          <p>• <code>.env</code> files - Check environment variables are set</p>
          <p>• <code>public/index.html</code> - Verify HTML template is correct</p>
        </div>
      </div>
    </div>
  );
};

export default Phase1Verification;
