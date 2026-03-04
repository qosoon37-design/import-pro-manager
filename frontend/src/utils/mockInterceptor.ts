/**
 * Mock API interceptor — active when DEMO_MODE = true.
 * Intercepts all axios requests and returns realistic mock data
 * without hitting any backend server.
 */
import type { AxiosInstance, AxiosResponse } from 'axios';
import {
  MOCK_BRANCHES, MOCK_PRODUCTS, MOCK_INVENTORY, MOCK_TRANSACTIONS,
  MOCK_ALERTS, MOCK_USERS, MOCK_EXCEL_IMPORTS, MOCK_ANALYTICS,
  MOCK_PROFIT, MOCK_SUMMARY,
} from './mockData';

function mockResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  };
}

function delay(ms = 200): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function installMockInterceptor(api: AxiosInstance) {
  api.interceptors.request.use(async (config) => {
    await delay(150);
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase();

    // ── inventory/summary ─────────────────────────────────────────────────
    if (url.includes('/inventory/summary')) {
      throw { isMock: true, response: mockResponse(MOCK_SUMMARY) };
    }

    // ── alerts ────────────────────────────────────────────────────────────
    if (url.startsWith('/alerts') && method === 'get') {
      throw { isMock: true, response: mockResponse({ alerts: MOCK_ALERTS, unreadCount: MOCK_ALERTS.filter(a => !a.isRead).length }) };
    }
    if (url.match(/\/alerts\/\w+\/read/) && method === 'patch') {
      throw { isMock: true, response: mockResponse({ ok: true }) };
    }
    if (url.includes('/alerts/read-all') && method === 'post') {
      throw { isMock: true, response: mockResponse({ ok: true }) };
    }

    // ── reports/analytics ─────────────────────────────────────────────────
    if (url.includes('/reports/analytics')) {
      throw { isMock: true, response: mockResponse(MOCK_ANALYTICS) };
    }
    // ── reports/profit ────────────────────────────────────────────────────
    if (url.includes('/reports/profit')) {
      throw { isMock: true, response: mockResponse(MOCK_PROFIT) };
    }
    // ── reports/inventory ────────────────────────────────────────────────
    if (url.includes('/reports/inventory')) {
      throw { isMock: true, response: mockResponse({ items: MOCK_INVENTORY }) };
    }
    // ── reports/transactions ─────────────────────────────────────────────
    if (url.includes('/reports/transactions')) {
      throw { isMock: true, response: mockResponse({ transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length }) };
    }
    // ── reports export ───────────────────────────────────────────────────
    if (url.includes('/reports/export')) {
      throw { isMock: true, response: mockResponse({ url: '#', message: 'Demo mode: export disabled' }) };
    }

    // ── products ─────────────────────────────────────────────────────────
    if (url.startsWith('/products') && method === 'get') {
      const searchMatch = url.match(/search=([^&]*)/);
      const search = searchMatch ? decodeURIComponent(searchMatch[1]).toLowerCase() : '';
      const filtered = search
        ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.nameAr.includes(search))
        : MOCK_PRODUCTS;
      throw { isMock: true, response: mockResponse({ products: filtered, total: filtered.length }) };
    }

    // ── inventory ────────────────────────────────────────────────────────
    if (url.startsWith('/inventory') && method === 'get') {
      throw { isMock: true, response: mockResponse({ inventory: MOCK_INVENTORY, total: MOCK_INVENTORY.length }) };
    }

    // ── transactions ─────────────────────────────────────────────────────
    if (url.startsWith('/transactions') && method === 'get') {
      throw { isMock: true, response: mockResponse({ transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length }) };
    }

    // ── branches ─────────────────────────────────────────────────────────
    if (url.startsWith('/branches') && method === 'get') {
      throw { isMock: true, response: mockResponse({ branches: MOCK_BRANCHES }) };
    }

    // ── users ─────────────────────────────────────────────────────────────
    if (url.startsWith('/users') && method === 'get') {
      throw { isMock: true, response: mockResponse({ users: MOCK_USERS }) };
    }

    // ── excel/imports ────────────────────────────────────────────────────
    if (url.includes('/excel/imports') && method === 'get') {
      throw { isMock: true, response: mockResponse({ imports: MOCK_EXCEL_IMPORTS }) };
    }
    if (url.includes('/excel/import') && method === 'post') {
      throw { isMock: true, response: mockResponse({ message: 'Demo mode: import disabled', importId: 'demo' }) };
    }
    if (url.match(/\/excel\/imports\/\w+\/rollback/) && method === 'post') {
      throw { isMock: true, response: mockResponse({ ok: true }) };
    }

    // ── uploads ──────────────────────────────────────────────────────────
    if (url.startsWith('/uploads') && method === 'post') {
      throw { isMock: true, response: mockResponse({ url: 'https://placehold.co/200x200?text=Demo' }) };
    }

    return config;
  });

  // Intercept the thrown mock responses
  api.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error?.isMock) return Promise.resolve(error.response);
      return Promise.reject(error);
    }
  );
}
