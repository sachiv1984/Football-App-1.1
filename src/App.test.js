import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import App from './App';

// Updated test case
test('renders Phase 1: Setup Verification Checklist', () => {
    const { debug } = render(<App />); // Render the App component and get the debug function
    debug(); // Log the rendered DOM to the console
    const headingElement = screen.getByText(/Phase 1: Setup Verification Checklist/i); // Search for the correct text
    expect(headingElement).toBeInTheDocument(); // Assert that the element is in the document
});
