/**
 * Frontend API Service Layer
 * Handles communication with the backend REST API and authentication headers.
 */

const TOKEN_KEY = 'pb_auth_token';

/**
 * Storage helpers for authentication token
 */
export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to access localStorage:', e);
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Unable to write to localStorage:', e);
    }
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to remove from localStorage:', e);
    }
  }
};

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const { headers = {}, body, ...customConfig } = options;

  const token = tokenStorage.get();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  const config = {
    ...customConfig,
    headers: defaultHeaders
  };

  if (body) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      // Network or parsing failure
      error.message = error.message || 'Unable to connect to server';
    }
    throw error;
  }
}

/**
 * Auth API Endpoints
 */
export const authApi = {
  register: (name, email, password) => {
    return request('/api/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
  },

  login: (email, password) => {
    return request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  loginDemo: () => {
    return request('/api/auth/demo', {
      method: 'POST'
    });
  },

  getCurrentUser: (tokenOverride) => {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {};
    return request('/api/auth/me', {
      method: 'GET',
      headers
    });
  }
};

/**
 * Transactions API Endpoints
 */
export const transactionsApi = {
  create: (transactionData) => {
    return request('/api/transactions', {
      method: 'POST',
      body: transactionData
    });
  },

  detectImport: (text) => {
    return request('/api/transactions/import/detect', {
      method: 'POST',
      body: { text }
    });
  },

  getAll: (params = {}) => {
    // Filter out undefined, null or empty string keys
    const filteredParams = {};
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });

    const queryString = new URLSearchParams(filteredParams).toString();
    return request(`/api/transactions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET'
    });
  },

  getById: (id) => {
    return request(`/api/transactions/${id}`, {
      method: 'GET'
    });
  },

  update: (id, transactionData) => {
    return request(`/api/transactions/${id}`, {
      method: 'PUT',
      body: transactionData
    });
  },

  delete: (id) => {
    return request(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Dashboard API Endpoints
 */
export const dashboardApi = {
  getSummary: (params = {}) => {
    const filteredParams = {};
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });

    const queryString = new URLSearchParams(filteredParams).toString();
    return request(`/api/dashboard/summary${queryString ? `?${queryString}` : ''}`, {
      method: 'GET'
    });
  }
};

/**
 * Budgets API Endpoints
 */
export const budgetsApi = {
  getAll: (params = {}) => {
    const filteredParams = {};
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });
    const queryString = new URLSearchParams(filteredParams).toString();
    return request(`/api/budgets${queryString ? `?${queryString}` : ''}`, {
      method: 'GET'
    });
  },

  getById: (id) => {
    return request(`/api/budgets/${id}`, { method: 'GET' });
  },

  create: (budgetData) => {
    return request('/api/budgets', {
      method: 'POST',
      body: budgetData
    });
  },

  update: (id, budgetData) => {
    return request(`/api/budgets/${id}`, {
      method: 'PUT',
      body: budgetData
    });
  },

  delete: (id) => {
    return request(`/api/budgets/${id}`, { method: 'DELETE' });
  }
};

/**
 * Savings Goals API (Phase 5)
 */
export const savingsApi = {
  getAll: () => {
    return request('/api/savings', {
      method: 'GET'
    });
  },

  getById: (id) => {
    return request(`/api/savings/${id}`, {
      method: 'GET'
    });
  },

  create: (goalData) => {
    return request('/api/savings', {
      method: 'POST',
      body: goalData
    });
  },

  update: (id, goalData) => {
    return request(`/api/savings/${id}`, {
      method: 'PUT',
      body: goalData
    });
  },

  contribute: (id, amount) => {
    return request(`/api/savings/${id}/contribute`, {
      method: 'PATCH',
      body: { amount }
    });
  },

  delete: (id) => {
    return request(`/api/savings/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Notifications API Endpoints
 */
export const notificationsApi = {
  getAll: () => {
    return request('/api/notifications', {
      method: 'GET'
    });
  },

  markAsRead: (id) => {
    return request(`/api/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  markAllAsRead: () => {
    return request('/api/notifications/read-all', {
      method: 'PATCH'
    });
  }
};

/**
 * Health Check API
 */
export const healthApi = {
  check: () => {
    return request('/api/health', {
      method: 'GET'
    });
  }
};

export default {
  auth: authApi,
  transactions: transactionsApi,
  dashboard: dashboardApi,
  budgets: budgetsApi,
  savings: savingsApi,
  notifications: notificationsApi,
  health: healthApi,
  tokenStorage
};
