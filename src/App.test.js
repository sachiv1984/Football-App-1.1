import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import App from './App';

// Sample test case
test('renders Hello, World!', () => {
    const { debug } = render(<App />); // Render the App component and get the debug function
    debug(); // Log the rendered DOM to the console
    const headingElement = screen.getByText(/Hello, World!/i); // Search for the text "Hello, World!"
    expect(headingElement).toBeInTheDocument(); // Assert that the element is in the document
});
