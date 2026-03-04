import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Apply persisted theme and lang on first load
const uiRaw = localStorage.getItem('ui-store');
if (uiRaw) {
  try {
    const { state } = JSON.parse(uiRaw);
    if (state?.theme) document.documentElement.setAttribute('data-theme', state.theme);
    if (state?.lang) {
      document.documentElement.lang = state.lang;
      document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    }
  } catch { /* ignore */ }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Tajawal, Inter, sans-serif',
            borderRadius: '0.75rem',
            fontSize: '0.95rem',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
