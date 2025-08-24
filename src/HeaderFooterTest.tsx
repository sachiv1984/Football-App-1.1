// src/HeaderFooterTest.tsx
import React from 'react';
import { Header, Footer } from './components/common';
import { Card, Button } from './components';

const HeaderFooterTest = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Test Header Component */}
      <Header />
      
      {/* Main Content Area */}
      <main className="flex-1 container mx-auto p-8">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Header & Footer Layout Test</h1>
          
          {/* Content to test scrolling and layout */}
          <Card className="p-6">
            <Card.Header title="Layout Verification" />
            <Card.Body>
              <div className="space-y-4">
                <p>This page tests the Header and Footer components integration:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Header:</strong> Should be sticky/fixed at the top with navigation</li>
                  <li><strong>Footer:</strong> Should be at the bottom of the page</li>
                  <li><strong>Main content:</strong> Should fill the space between header and footer</li>
                  <li><strong>Responsive:</strong> Should work on mobile and desktop</li>
                </ul>
                
                <div className="flex gap-4 flex-wrap mt-6">
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="secondary">Secondary Action</Button>
                  <Button variant="outline">Outline Button</Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Add some content to test scrolling */}
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i} className="p-6">
              <Card.Header title={`Content Section ${i + 1}`} />
              <Card.Body>
                <p className="text-gray-600">
                  This is test content section {i + 1}. It helps verify that the header stays 
                  at the top and footer stays at the bottom when scrolling through content.
                  The layout should be responsive and work well across different screen sizes.
                </p>
              </Card.Body>
            </Card>
          ))}
        </div>
      </main>
      
      {/* Test Footer Component */}
      <Footer />
    </div>
  );
};

export default HeaderFooterTest;
