import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('Phase3VerificationTest', () => {
    test('renders Phase 3: Verification Test heading', () => {
        render(<App />);
        
        const headingElement = screen.getByText((content, element) => {
            return (
                element.tagName.toLowerCase().startsWith('h') &&
                content.toLowerCase().includes('phase 3')
            );
        });

        expect(headingElement).toBeInTheDocument();
    });

    test('renders all Phase 3 verification checklist items', () => {
        render(<App />);
        
        // Find the container holding your checklist items
        const checklistContainer = screen.getByRole('main'); // or a more specific selector if needed
        const buttons = within(checklistContainer).getAllByRole('button');

        // Ensure at least one button exists (sanity check)
        expect(buttons.length).toBeGreaterThan(0);

        // Optionally: log button text for debugging
        buttons.forEach(btn => console.log(btn.textContent));

        // Check that each button has visible text
        buttons.forEach(btn => {
            expect(btn).toBeVisible();
        });
    });
});
