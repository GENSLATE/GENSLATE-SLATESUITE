import '@genslate/design-system/fonts.css';
import './styles/main.css';

import { applyInitialTheme } from '@genslate/design-system/theme-init';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app.component';
import { AppProviders } from './app/app.providers';

// Theme the document before React's first paint (no flash of the wrong theme).
applyInitialTheme();

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
