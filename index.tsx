
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import { ModalProvider } from './contexts/ModalContext';

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
