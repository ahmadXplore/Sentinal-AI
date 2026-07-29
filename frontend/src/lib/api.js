const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sentinelai_token');
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...options.headers,
    };

    // Don't set Content-Type for FormData (let browser set boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Optional timeout via AbortController
    let controller;
    let timeoutId;
    if (options.timeoutMs) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller ? controller.signal : options.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sentinelai_token');
            localStorage.removeItem('sentinelai_user');
            window.location.href = '/login';
          }
        }
        const error = new Error(data.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        const error = new Error('Request timed out. The AI model is taking too long to respond. Please try again.');
        error.status = 408;
        throw error;
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  verifyOtp(otpToken, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otpToken, otp }),
    });
  }

  googleLogin(credential) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  }

  getProfile() {
    return this.request('/auth/profile');
  }

  verifyToken() {
    return this.request('/auth/verify');
  }

  // Logs
  getLogs(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({ page, limit, ...filters });
    return this.request(`/logs?${params}`);
  }

  getLog(id) {
    return this.request(`/logs/${id}`);
  }

  uploadLog(file) {
    const formData = new FormData();
    formData.append('logfile', file);
    return this.request('/logs/upload', {
      method: 'POST',
      body: formData,
    });
  }

  deleteLog(id) {
    return this.request(`/logs/${id}`, { method: 'DELETE' });
  }

  // AI — 10 minute timeout so UI shows a clear error rather than hanging indefinitely
  summarizeLog(logId) {
    return this.request(`/ai/summarize/${logId}`, { method: 'POST', timeoutMs: 600000 });
  }

  getSummary(logId) {
    return this.request(`/ai/summary/${logId}`);
  }

  getAIHealth() {
    return this.request('/ai/health');
  }

  // Dashboard
  getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Rules
  getRules() {
    return this.request('/rules');
  }

  getRule(id) {
    return this.request(`/rules/${id}`);
  }

  createRule(data) {
    return this.request('/rules', { method: 'POST', body: JSON.stringify(data) });
  }

  updateRule(id, data) {
    return this.request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteRule(id) {
    return this.request(`/rules/${id}`, { method: 'DELETE' });
  }

  toggleRule(id) {
    return this.request(`/rules/${id}/toggle`, { method: 'PATCH' });
  }

  // Alerts
  getAlerts(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({ page, limit, ...filters });
    return this.request(`/alerts?${params}`);
  }

  getAlert(id) {
    return this.request(`/alerts/${id}`);
  }

  updateAlertStatus(id, status) {
    return this.request(`/alerts/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }

  assignAlert(id, userId) {
    return this.request(`/alerts/${id}/assign`, { method: 'PUT', body: JSON.stringify({ userId }) });
  }

  addAlertNote(id, text) {
    return this.request(`/alerts/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) });
  }

  getCorrelatedAlerts(id) {
    return this.request(`/alerts/${id}/correlations`);
  }

  // Admin – User Management
  getUsers() {
    return this.request('/auth/users');
  }

  createUser(data) {
    return this.request('/auth/users', { method: 'POST', body: JSON.stringify(data) });
  }

  updateUserRole(id, role) {
    return this.request(`/auth/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
  }

  toggleUserBlock(id, blocked) {
    return this.request(`/auth/users/${id}/block`, { method: 'PATCH', body: JSON.stringify({ blocked }) });
  }

  deleteUser(id) {
    return this.request(`/auth/users/${id}`, { method: 'DELETE' });
  }

  // ── AI Chat ────────────────────────────────────────────────
  startChatSession(contextType, contextId) {
    return this.request('/chat/session', {
      method: 'POST',
      body: JSON.stringify({ contextType, contextId }),
    });
  }

  sendChatMessage(sessionId, message) {
    return this.request(`/chat/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
      timeoutMs: 600000,
    });
  }

  async sendChatMessageStream(sessionId, message) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${this.baseUrl}/chat/${sessionId}/message?stream=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Streaming failed');
    }

    return response.body; // ReadableStream
  }

  getChatHistory(sessionId) {
    return this.request(`/chat/${sessionId}/history`);
  }

  getChatSessions(contextType, contextId) {
    return this.request(`/chat/sessions/${contextType}/${contextId}`);
  }

  // ── Incident Reports ────────────────────────────────────────
  generateIncidentReport(alertId, analystNotes = '') {
    return this.request(`/incidents/generate/${alertId}`, {
      method: 'POST',
      body: JSON.stringify({ analystNotes }),
      timeoutMs: 600000,
    });
  }

  regenerateIncidentReport(alertId) {
    return this.request(`/incidents/generate/${alertId}?regenerate=true`, {
      method: 'POST',
      timeoutMs: 600000,
    });
  }

  getIncidentReport(alertId) {
    return this.request(`/incidents/${alertId}`);
  }

  updateIncidentReport(id, data) {
    return this.request(`/incidents/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  assignIncident(id, userId) {
    return this.request(`/incidents/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  }

  listIncidentReports(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({ page, limit, ...filters });
    return this.request(`/incidents?${params}`);
  }

  // ── MITRE Explainer ─────────────────────────────────────────
  explainMitreTechnique(techniqueId, techniqueName) {
    const params = techniqueName ? `?techniqueName=${encodeURIComponent(techniqueName)}` : '';
    return this.request(`/incidents/mitre/${techniqueId}${params}`, { timeoutMs: 120000 });
  }

  // ── Explainable AI ──────────────────────────────────────────
  explainAlert(alertId) {
    return this.request(`/ai/explain/${alertId}`, { timeoutMs: 120000 });
  }

  // ── Machine Learning ─────────────────────────────────────────
  getMlHealth() {
    return this.request('/ml/health');
  }

  analyzeAnomaly(logs) {
    return this.request('/ml/analyze', {
      method: 'POST',
      body: JSON.stringify({ logs }),
    });
  }

  classifyThreat(log) {
    return this.request('/ml/classify', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }
}

const api = new ApiClient();
export default api;


