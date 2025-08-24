import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('Phase3VerificationTest', () => {
    test('renders Phase 3: Verification Test heading', () => {
        const { debug } = render(<App />);
        debug(); // Logs the rendered DOM to the console

        // Flexible matcher: finds an element containing 'Phase 3' in an h1 or h2
        const headingElement = screen.getByText((content, element) => {
            return (
                element.tagName.toLowerCase().startsWith('h') &&
                content.toLowerCase().includes('phase 3')
            );
        });

        expect(headingElement).toBeInTheDocument();
    });

    // Example: You can add more Phase 3 checks here
    test('renders Phase 3 verification checklist', () => {
        const { debug } = render(<App />);
        // Replace 'Checklist Item 1' with actual checklist text
        const checklistItem = screen.getByText(/Checklist Item 1/i);
        expect(checklistItem).toBeInTheDocument();
    });
});
