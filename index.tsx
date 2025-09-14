
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error handlers to improve debugging for initialization errors (TDZ etc.)
window.addEventListener('error', (event) => {
  try {
    // Log to console with extra context
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', event.error || event.message, event.error ? event.error.stack : '');
  } catch (e) {
    // ignore
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    // eslint-disable-next-line no-console
    console.error('[UnhandledRejection]', event.reason, event.reason && event.reason.stack ? event.reason.stack : '');
  } catch (e) {
    // ignore
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
