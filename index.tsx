import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RepoProvider } from '@automerge/automerge-repo-react';
import { repo } from './lib/automerge-repo';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RepoProvider repo={repo}>
        <App />
      </RepoProvider>
    </ErrorBoundary>
  </React.StrictMode>
);