import '@genslate/design-system/fonts.css';
import './styles/main.css';

import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { App } from './app/app.component';
import { stripBase } from './app/router/router.util';
import { resolveRoute } from './app/routes';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

// Load the current page's data first so hydration sees exactly what was prerendered.
const initial = await resolveRoute(stripBase(location.pathname, import.meta.env.BASE_URL) ?? '/');
const app = (
  <StrictMode>
    <App initial={initial} />
  </StrictMode>
);

// Prerendered pages hydrate; the dev server starts from an empty #root.
if (container.firstElementChild) hydrateRoot(container, app);
else createRoot(container).render(app);
