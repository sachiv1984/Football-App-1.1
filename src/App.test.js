import React from 'react';
import { render, screen } from '@testing-library/react';
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

        // List all the checklist items exactly as they appear in your App
        const checklistItems = [
            'Verify user login',
            'Check data integrity',
            'Validate form inputs',
            'Confirm email notifications'
            // Add more items here as needed
        ];

        // Loop through each item and check if it exists
        checklistItems.forEach((itemText) => {
            const item = screen.getByText(new RegExp(itemText, 'i'));
            expect(item).toBeInTheDocument();
        });
    });
});
