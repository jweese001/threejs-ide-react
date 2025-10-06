import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('renders the IDE interface', () => {
    render(<App />);

    // Check that the snippet drawer button is present
    const snippetsButton = screen.getByText(/Snippets/i);
    expect(snippetsButton).toBeInTheDocument();
  });

  test('renders the status bar with keyboard shortcut reminder', () => {
    render(<App />);

    // Check that the keyboard shortcut reminder is present
    const shortcutText = screen.getByText(/Cmd\/Ctrl\+Shift\+R to reset/i);
    expect(shortcutText).toBeInTheDocument();
  });

  test('renders the editor container', () => {
    const { container } = render(<App />);

    // Check that the editor container exists
    const editorContainer = container.querySelector('#editor-container');
    expect(editorContainer).toBeInTheDocument();
  });

  test('renders the preview container', () => {
    const { container } = render(<App />);

    // Check that the preview container exists
    const previewContainer = container.querySelector('#preview-container');
    expect(previewContainer).toBeInTheDocument();
  });
});
