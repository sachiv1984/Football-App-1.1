import { render, screen } from '@testing-library/react';
import React from 'react';

// Sample React Component
function App() {
    return <h1>Hello, World!</h1>;
}

// Test for the React Component
test('renders Hello, World!', () => {
    render(<App />);
    const headingElement = screen.getByText(/Hello, World!/i);
    expect(headingElement).toBeInTheDocument();
});
