import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ContentProvider } from './cms/ContentProvider.jsx';
import './styles.css';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = /^\/admin\/?$/.test(window.location.pathname);
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <Suspense fallback={<main role="status">Loading content admin…</main>}><AdminApp /></Suspense> : <ContentProvider><App /></ContentProvider>}
  </React.StrictMode>
);
