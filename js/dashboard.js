let currentPage = 'dashboard';
let currentPages = {};
let currentFilters = {};

function navigateTo(page) {
  window.location.href = page + '.html';
}

function loadPageData() {
  const page = typeof PAGE_ID !== 'undefined' ? PAGE_ID : 'dashboard';
  currentPage = page;
  // Update page title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    const titles = { dashboard:'Dashboard', users:'Foydalanuvchilar', products:'Mahsulotlar', accesses:'Ruxsatlar', sessions:'Sessiyalar', orders:'Buyurtmalar', topups:"Balans to'ldirish", coupons:'Kuponlar', redemptions:'Kupon ishlatish', questions:'Savollar', choices:'Variantlar', audio:'Audio treklar', notifications:'Bildirishnomalar', grammar:'Grammatika', 'ai-chat':'AI Chat', plans:'Tarif rejalar', subscriptions:'Obunalar', 'voice-logs':'Ovoz jurnallari' };
    titleEl.textContent = titles[page] || page;
  }
  // Update username
  const userEl = document.getElementById('topbarUser');
  if (userEl) userEl.textContent = localStorage.getItem('user_info') || 'Admin';
  // Highlight active nav link
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');
  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'users': loadUsers(currentPages.users || 1); break;
    case 'products': loadProducts(currentPages.products || 1); break;
    case 'accesses': loadAccesses(currentPages.accesses || 1); break;
    case 'sessions': loadSessions(currentPages.sessions || 1); break;
    case 'orders': loadOrders(currentPages.orders || 1); break;
    case 'topups': loadTopups(currentPages.topups || 1); break;
    case 'coupons': loadCoupons(currentPages.coupons || 1); break;
    case 'redemptions': loadRedemptions(currentPages.redemptions || 1); break;
    case 'questions': loadQuestions(currentPages.questions || 1); break;
    case 'choices': loadChoices(currentPages.choices || 1); break;
    case 'audio': loadAudio(currentPages.audio || 1); break;
    case 'notifications': loadNotifications(currentPages.notifications || 1); break;
    case 'grammar': loadGrammar(currentPages.grammar || 1); break;
    case 'ai-chat': loadAiChat(currentPages['ai-chat'] || 1); break;
    case 'plans': loadPlans(currentPages.plans || 1); break;
    case 'subscriptions': loadSubscriptions(currentPages.subscriptions || 1); break;
    case 'voice-logs': loadVoiceLogs(currentPages['voice-logs'] || 1); break;
  }
}

function showLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('show');
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('show');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const id = 'toast-' + Date.now();
  const html = `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
  const toastEl = document.getElementById(id);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('uz-UZ');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('uz-UZ');
}

function truncateText(text, len = 50) {
  if (!text) return '-';
  return text.length > len ? text.substring(0, len) + '...' : text;
}

async function handleLogout() {
  try {
    await apiLogout();
  } catch (e) { /* ignore */ }
  window.location.replace('login.html');
}

function applyFilters(page) {
  currentFilters[page] = {};
  const filterEls = document.querySelectorAll(`#page-${page} [data-filter]`);
  filterEls.forEach(el => {
    const key = el.getAttribute('data-filter');
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
      currentFilters[page][key] = el.value;
    }
  });
}

function buildQueryString(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? '?' + parts.join('&') : '';
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
  showLoading();
  try {
    const data = await apiGet('/api/admin/dashboard/', '');
    const keyMap = {
      'totalUsers': data.total_users,
      'activeUsers': data.active_users,
      'totalOrders': data.total_orders,
      'revenue': data.monthly_revenue,
      'totalSubscriptions': data.active_subscriptions,
      'activeSubscriptions': data.active_subscriptions
    };
    Object.entries(keyMap).forEach(([id, val]) => {
      const el = document.getElementById('stat-' + id);
      if (el) {
        if (typeof val === 'number') el.textContent = id === 'revenue' ? val.toLocaleString() + ' UZS' : val.toLocaleString();
        else if (val) el.textContent = val;
      }
    });
    try {
      const ordersData = await apiList('/api/admin/orders/', { page: 1, page_size: 5 });
      renderDashboardRecentOrders(ordersData.results || []);
    } catch {
      renderDashboardRecentOrders([]);
    }
    try {
      const chartData = { labels: ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'], data: [data.monthly_revenue * 0.2 || 0, data.monthly_revenue * 0.25 || 0, data.monthly_revenue * 0.3 || 0, data.monthly_revenue * 0.25 || 0] };
      renderDashboardChart(chartData);
    } catch {}
  } catch (err) {
    showToast('Failed to load dashboard: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderDashboardRecentOrders(orders) {
  const tbody = document.querySelector('#page-dashboard .recent-orders-table tbody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent orders</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.order_id || o.id}</td>
      <td>${o.user_fullname || o.user_username || o.user_id || o.user || '-'}</td>
      <td>${o.amount_display || Number(o.amount || 0).toLocaleString() + ' UZS'}</td>
      <td><span class="badge bg-${o.status === 'success' || o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'}">${o.status || '-'}</span></td>
      <td>${formatDateTime(o.created_at)}</td>
    </tr>
  `).join('');
}

function renderDashboardChart(chartData) {
  const canvas = document.getElementById('dashboardChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window._dashboardChart) window._dashboardChart.destroy();
  window._dashboardChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels || [],
      datasets: [{
        label: 'Revenue',
        data: chartData.data || [],
        borderColor: '#4f46e5',
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

// ==================== USERS ====================

async function loadUsers(page = 1) {
  showLoading();
  try {
    applyFilters('users');
    const params = { page, ...currentFilters.users };
    const data = await apiList('/api/admin/users/', params);
    currentPages.users = page;
    renderUsers(data);
  } catch (err) {
    showToast('Failed to load users: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderUsers(data) {
  const tbody = document.querySelector('#page-users .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Foydalanuvchi topilmadi</td></tr>';
  } else {
      tbody.innerHTML = results.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.phone_number || '-'}</td>
          <td>${u.full_name || '-'}</td>
          <td>${u.username || '-'}</td>
          <td>${Number(u.balance || 0).toLocaleString()}</td>
          <td>
            ${!u.is_active ? '<span class="badge bg-danger">Bloklangan</span>' : u.is_superuser ? '<span class="badge bg-info ms-1">Superadmin</span>' : '<span class="badge bg-success">Faol</span>'}
            ${u.is_staff ? '<span class="badge bg-secondary ms-1">Staff</span>' : ''}
          </td>
          <td>${formatDateTime(u.date_joined)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="showUserModal(${u.id})" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-${u.is_active ? 'warning' : 'success'} me-1" onclick="toggleUserBlock(${u.id}, ${!u.is_active})" title="${!u.is_active ? 'Unblock' : 'Block'}"><i class="bi bi-${u.is_active ? 'lock' : 'unlock'}"></i></button>
            <button class="btn btn-sm btn-outline-${u.is_superuser ? 'secondary' : 'info'} me-1" onclick="toggleUserAdmin(${u.id}, ${u.is_superuser})" title="${u.is_superuser ? 'Remove Admin' : 'Make Admin'}"><i class="bi bi-shield-${u.is_superuser ? 'slash' : 'fill'}"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');
  }
  updatePagination('users', data, 'users');
}

function showUserModal(userId = null) {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');
  form.reset();
  document.getElementById('userId').value = userId || '';
  if (userId) {
    title.textContent = 'Edit User';
    showLoading();
    apiGet('/api/admin/users/', userId).then(u => {
      document.getElementById('userPhone').value = u.phone_number || '';
      document.getElementById('userFullName').value = u.full_name || '';
      document.getElementById('userUsername').value = u.username || '';
      document.getElementById('userPassword').value = '';
      document.getElementById('userBalance').value = u.balance || 0;
      document.getElementById('userIsBlocked').checked = !u.is_active;
      document.getElementById('userIsAdmin').checked = u.is_superuser || false;
      document.getElementById('userIsStaff').checked = u.is_staff || false;
    }).catch(err => showToast('Failed to load user: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create User';
    document.getElementById('userPassword').setAttribute('required', 'required');
  }
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

async function saveUser() {
  const id = document.getElementById('userId').value;
  const data = {
    phone_number: document.getElementById('userPhone').value.trim(),
    full_name: document.getElementById('userFullName').value.trim(),
    username: document.getElementById('userUsername').value.trim(),
    balance: parseFloat(document.getElementById('userBalance').value) || 0,
    is_active: !document.getElementById('userIsBlocked').checked,
    is_superuser: document.getElementById('userIsAdmin').checked,
    is_staff: document.getElementById('userIsStaff').checked
  };
  const password = document.getElementById('userPassword').value;
  if (password) data.password = password;
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/users/', id, data);
      showToast('User updated');
    } else {
      await apiCreate('/api/admin/users/', data);
      showToast('User created');
    }
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    loadUsers(currentPages.users || 1);
  } catch (err) {
    showToast('Failed to save user: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/users/', id);
    showToast('User deleted');
    loadUsers(currentPages.users || 1);
  } catch (err) {
    showToast('Failed to delete user: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function toggleUserBlock(id, currentlyBlocked) {
  showLoading();
  try {
    if (currentlyBlocked) {
      await apiAction('/api/admin/users/', id, 'unblock/');
      showToast('User unblocked');
    } else {
      await apiAction('/api/admin/users/', id, 'block/');
      showToast('User blocked');
    }
    loadUsers(currentPages.users || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function toggleUserAdmin(id, currentlyAdmin) {
  showLoading();
  try {
    if (currentlyAdmin) {
      await apiAction('/api/admin/users/', id, 'remove_admin/');
      showToast('Admin rights removed');
    } else {
      await apiAction('/api/admin/users/', id, 'make_admin/');
      showToast('Admin rights granted');
    }
    loadUsers(currentPages.users || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== EXAM PRODUCTS ====================

async function loadProducts(page = 1) {
  showLoading();
  try {
    applyFilters('products');
    const params = { page, ...currentFilters.products };
    const data = await apiList('/api/admin/exam-products/', params);
    currentPages.products = page;
    renderProducts(data);
  } catch (err) {
    showToast('Failed to load products: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderProducts(data) {
  const tbody = document.querySelector('#page-products .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Mahsulot topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name || '-'}</td>
      <td>${p.description ? truncateText(p.description, 60) : '-'}</td>
      <td>${Number(p.price || 0).toLocaleString()} UZS</td>
      <td>${p.duration_days || '-'} days</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showProductModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('products', data, 'products');
}

function showProductModal(id = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productId').value = id || '';
  if (id) {
    title.textContent = 'Edit Product';
    showLoading();
    apiGet('/api/admin/exam-products/', id).then(p => {
      document.getElementById('productTitle').value = p.name || '';
      document.getElementById('productDescription').value = p.description || '';
      document.getElementById('productPrice').value = p.price || 0;
      document.getElementById('productDuration').value = p.duration_days || 30;
    }).catch(err => showToast('Failed to load product: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Product';
  }
  new bootstrap.Modal(modal).show();
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const data = {
    name: document.getElementById('productTitle').value.trim(),
    description: document.getElementById('productDescription').value.trim(),
    price: parseFloat(document.getElementById('productPrice').value) || 0,
    duration_days: parseInt(document.getElementById('productDuration').value) || 30
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/exam-products/', id, data);
      showToast('Product updated');
    } else {
      await apiCreate('/api/admin/exam-products/', data);
      showToast('Product created');
    }
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts(currentPages.products || 1);
  } catch (err) {
    showToast('Failed to save product: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/exam-products/', id);
    showToast('Product deleted');
    loadProducts(currentPages.products || 1);
  } catch (err) {
    showToast('Failed to delete product: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== EXAM ACCESSES ====================

async function loadAccesses(page = 1) {
  showLoading();
  try {
    applyFilters('accesses');
    const params = { page, ...currentFilters.accesses };
    const data = await apiList('/api/admin/exam-accesses/', params);
    currentPages.accesses = page;
    renderAccesses(data);
  } catch (err) {
    showToast('Failed to load accesses: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderAccesses(data) {
  const tbody = document.querySelector('#page-accesses .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Ruxsat topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.user_fullname || a.user_username || a.user || '-'}</td>
      <td>${a.product_name || a.product || '-'}</td>
      <td>${a.attempts_used || 0}</td>
      <td>${a.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td>${formatDateTime(a.expires_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline-warning me-1" onclick="resetAttempts(${a.id})" title="Reset Attempts"><i class="bi bi-arrow-counterclockwise"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('accesses', data, 'accesses');
}

function showGrantAccessModal() {
  const modal = document.getElementById('grantAccessModal');
  document.getElementById('grantAccessForm').reset();
  new bootstrap.Modal(modal).show();
}

async function grantAccess() {
  const data = {
    user: parseInt(document.getElementById('grantUserId').value),
    product: parseInt(document.getElementById('grantProductId').value) || undefined,
    attempts_used: 0
  };
  showLoading();
  try {
    await apiPost('/api/admin/exam-accesses/grant_access/', data);
    showToast('Access granted');
    bootstrap.Modal.getInstance(document.getElementById('grantAccessModal')).hide();
    loadAccesses(currentPages.accesses || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function resetAttempts(id) {
  if (!confirm('Reset attempts for this access?')) return;
  showLoading();
  try {
    await apiAction('/api/admin/exam-accesses/', id, 'reset_attempts/');
    showToast('Attempts reset');
    loadAccesses(currentPages.accesses || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== EXAM SESSIONS ====================

async function loadSessions(page = 1) {
  showLoading();
  try {
    applyFilters('sessions');
    const params = { page, ...currentFilters.sessions };
    const data = await apiList('/api/admin/exam-sessions/', params);
    currentPages.sessions = page;
    renderSessions(data);
  } catch (err) {
    showToast('Failed to load sessions: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderSessions(data) {
  const tbody = document.querySelector('#page-sessions .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Sessiya topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.user_fullname || s.user_username || s.user || '-'}</td>
      <td>${s.product_name || s.product || '-'}</td>
      <td><span class="badge bg-${s.is_active ? 'primary' : 'success'}">${s.is_active ? 'Faol' : 'Tugagan'}</span></td>
      <td>${formatDateTime(s.started_at)}</td>
      <td>
        ${s.is_active ? `<button class="btn btn-sm btn-outline-danger" onclick="forceSubmitSession(${s.id})" title="Force Submit"><i class="bi bi-skip-end"></i></button>` : ''}
      </td>
    </tr>
  `).join('');
  updatePagination('sessions', data, 'sessions');
}

async function forceSubmitSession(id) {
  if (!confirm('Force submit this session?')) return;
  showLoading();
  try {
    await apiAction('/api/admin/exam-sessions/', id, 'force_submit/');
    showToast('Session force submitted');
    loadSessions(currentPages.sessions || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== ORDERS ====================

async function loadOrders(page = 1) {
  showLoading();
  try {
    applyFilters('orders');
    const params = { page, ...currentFilters.orders };
    const data = await apiList('/api/admin/orders/', params);
    currentPages.orders = page;
    renderOrders(data);
  } catch (err) {
    showToast('Failed to load orders: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderOrders(data) {
  const tbody = document.querySelector('#page-orders .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Buyurtma topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(o => `
    <tr>
      <td>${o.order_id || o.id}</td>
      <td>${o.user_fullname || o.user_username || o.user_id || '-'}</td>
      <td>${o.amount_display || Number(o.amount || 0).toLocaleString() + ' UZS'}</td>
      <td><span class="badge bg-${o.status === 'success' || o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'}">${o.status || '-'}</span></td>
      <td>${formatDateTime(o.created_at)}</td>
      <td>
        ${o.type !== 'refund' ? `<button class="btn btn-sm btn-outline-warning" onclick="refundOrder('${o.order_id || o.id}')" title="Refund"><i class="bi bi-arrow-return-left"></i></button>` : ''}
      </td>
    </tr>
  `).join('');
  updatePagination('orders', data, 'orders');
}

async function refundOrder(id) {
  if (!confirm('Refund this order?')) return;
  showLoading();
  try {
    await apiAction('/api/admin/orders/', id, 'refund/');
    showToast('Order refunded');
    loadOrders(currentPages.orders || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== BALANCE TOPUPS ====================

async function loadTopups(page = 1) {
  showLoading();
  try {
    applyFilters('topups');
    const params = { page, ...currentFilters.topups };
    const data = await apiList('/api/admin/balance-topups/', params);
    currentPages.topups = page;
    renderTopups(data);
  } catch (err) {
    showToast('Failed to load topups: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderTopups(data) {
  const tbody = document.querySelector('#page-topups .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">To'ldirish topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(t => `
    <tr>
      <td>${t.id ? t.id.substring(0, 8) + '...' : t.id}</td>
      <td>${t.user_fullname || t.user_username || t.user || '-'}</td>
      <td>${Number(t.amount || 0).toLocaleString()} UZS</td>
      <td><span class="badge bg-${t.status === 'paid' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}">${t.status || '-'}</span></td>
      <td>${formatDateTime(t.created_at)}</td>
    </tr>
  `).join('');
  updatePagination('topups', data, 'topups');
}

// ==================== COUPONS ====================

async function loadCoupons(page = 1) {
  showLoading();
  try {
    applyFilters('coupons');
    const params = { page, ...currentFilters.coupons };
    const data = await apiList('/api/admin/coupons/', params);
    currentPages.coupons = page;
    renderCoupons(data);
  } catch (err) {
    showToast('Failed to load coupons: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderCoupons(data) {
  const tbody = document.querySelector('#page-coupons .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Kupon topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><code>${c.code || '-'}</code></td>
      <td>${c.discount_type === 'percent' ? c.discount_value + '%' : Number(c.discount_value || 0).toLocaleString() + ' UZS'}</td>
      <td>${c.max_uses || '∞'} / ${c.used_count || 0}</td>
      <td>${c.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>'}</td>
      <td>${c.expires_at ? formatDate(c.expires_at) : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showCouponModal(${c.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCoupon(${c.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('coupons', data, 'coupons');
}

function showCouponModal(id = null) {
  const modal = document.getElementById('couponModal');
  const title = document.getElementById('couponModalTitle');
  const form = document.getElementById('couponForm');
  form.reset();
  document.getElementById('couponId').value = id || '';
  if (id) {
    title.textContent = 'Edit Coupon';
    showLoading();
    apiGet('/api/admin/coupons/', id).then(c => {
      document.getElementById('couponCode').value = c.code || '';
      document.getElementById('couponDiscountType').value = c.discount_type || 'percent';
      document.getElementById('couponDiscountValue').value = c.discount_value || 0;
      document.getElementById('couponMaxUses').value = c.max_uses || '';
      document.getElementById('couponIsActive').checked = c.is_active !== false;
      document.getElementById('couponExpiresAt').value = c.expires_at ? c.expires_at.substring(0, 10) : '';
    }).catch(err => showToast('Failed to load coupon: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Coupon';
  }
  new bootstrap.Modal(modal).show();
}

async function saveCoupon() {
  const id = document.getElementById('couponId').value;
  const data = {
    code: document.getElementById('couponCode').value.trim(),
    discount_type: document.getElementById('couponDiscountType').value,
    discount_value: parseFloat(document.getElementById('couponDiscountValue').value) || 0,
    max_uses: parseInt(document.getElementById('couponMaxUses').value) || null,
    is_active: document.getElementById('couponIsActive').checked,
    expires_at: document.getElementById('couponExpiresAt').value || null
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/coupons/', id, data);
      showToast('Coupon updated');
    } else {
      await apiCreate('/api/admin/coupons/', data);
      showToast('Coupon created');
    }
    bootstrap.Modal.getInstance(document.getElementById('couponModal')).hide();
    loadCoupons(currentPages.coupons || 1);
  } catch (err) {
    showToast('Failed to save coupon: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/coupons/', id);
    showToast('Coupon deleted');
    loadCoupons(currentPages.coupons || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function generateCoupon() {
  showLoading();
  try {
    const data = await apiPost('/api/admin/coupons/generate/', {});
    showToast('Coupon generated: ' + data.code);
    loadCoupons(currentPages.coupons || 1);
  } catch (err) {
    showToast('Failed to generate coupon: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== COUPON REDEMPTIONS ====================

async function loadRedemptions(page = 1) {
  showLoading();
  try {
    applyFilters('redemptions');
    const params = { page, ...currentFilters.redemptions };
    const data = await apiList('/api/admin/coupon-redemptions/', params);
    currentPages.redemptions = page;
    renderRedemptions(data);
  } catch (err) {
    showToast('Failed to load redemptions: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderRedemptions(data) {
  const tbody = document.querySelector('#page-redemptions .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Kupon ishlatish topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.coupon_code || r.coupon || '-'}</td>
      <td>${r.user_fullname || r.user_username || r.user || '-'}</td>
      <td>${Number(r.amount || 0).toLocaleString()} UZS</td>
      <td>${formatDateTime(r.redeemed_at)}</td>
    </tr>
  `).join('');
  updatePagination('redemptions', data, 'redemptions');
}

// ==================== QUESTIONS ====================

async function loadQuestions(page = 1) {
  showLoading();
  try {
    applyFilters('questions');
    const params = { page, ...currentFilters.questions };
    const data = await apiList('/api/admin/questions/', params);
    currentPages.questions = page;
    renderQuestions(data);
  } catch (err) {
    showToast('Failed to load questions: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderQuestions(data) {
  const tbody = document.querySelector('#page-questions .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Savol topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(q => `
    <tr>
      <td>${q.id}</td>
      <td>${truncateText(q.text || '', 60)}</td>
      <td>${q.section_display || q.section || '-'}</td>
      <td><span class="badge bg-success">${q.choices_count || 0} variants</span></td>
      <td>${q.audio_start_time ? '<i class="bi bi-music-note text-success"></i>' : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showQuestionModal(${q.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-info me-1" onclick="duplicateQuestion(${q.id})" title="Duplicate"><i class="bi bi-copy"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteQuestion(${q.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('questions', data, 'questions');
}

function showQuestionModal(id = null) {
  const modal = document.getElementById('questionModal');
  const title = document.getElementById('questionModalTitle');
  const form = document.getElementById('questionForm');
  form.reset();
  document.getElementById('questionId').value = id || '';
  if (id) {
    title.textContent = 'Edit Question';
    showLoading();
    apiGet('/api/admin/questions/', id).then(q => {
      document.getElementById('questionTextUz').value = q.text || '';
      document.getElementById('questionTextRu').value = '';
      document.getElementById('questionTextEn').value = '';
      document.getElementById('questionPart').value = q.section || 'listening';
      document.getElementById('questionIsActive').checked = true;
      if (q.audio_start_time) document.getElementById('questionCurrentAudio').textContent = 'Audio: yes';
    }).catch(err => showToast('Failed to load question: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Question';
  }
  new bootstrap.Modal(modal).show();
}

async function saveQuestion() {
  const id = document.getElementById('questionId').value;
  const audioFile = document.getElementById('questionAudioFile').files[0];
  const isFormData = !!audioFile;
  const data = isFormData ? new FormData() : {
    text: document.getElementById('questionTextUz').value.trim(),
    section: document.getElementById('questionPart').value
  };
  if (isFormData) {
    data.append('text', document.getElementById('questionTextUz').value.trim());
    data.append('section', document.getElementById('questionPart').value);
    data.append('audio_file', audioFile);
  }
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/questions/', id, data, isFormData);
      showToast('Question updated');
    } else {
      await apiCreate('/api/admin/questions/', data, isFormData);
      showToast('Question created');
    }
    bootstrap.Modal.getInstance(document.getElementById('questionModal')).hide();
    loadQuestions(currentPages.questions || 1);
  } catch (err) {
    showToast('Failed to save question: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/questions/', id);
    showToast('Question deleted');
    loadQuestions(currentPages.questions || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function duplicateQuestion(id) {
  showLoading();
  try {
    await apiAction('/api/admin/questions/', id, 'duplicate/');
    showToast('Question duplicated');
    loadQuestions(currentPages.questions || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== CHOICES ====================

async function loadChoices(page = 1) {
  showLoading();
  try {
    applyFilters('choices');
    const params = { page, ...currentFilters.choices };
    const data = await apiList('/api/admin/choices/', params);
    currentPages.choices = page;
    renderChoices(data);
  } catch (err) {
    showToast('Failed to load choices: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderChoices(data) {
  const tbody = document.querySelector('#page-choices .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Variant topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.question || '-'}</td>
      <td>${truncateText(c.text || '', 40)}</td>
      <td>${c.is_correct ? '<span class="badge bg-success">Correct</span>' : '<span class="badge bg-secondary">Wrong</span>'}</td>
      <td>${c.number || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showChoiceModal(${c.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteChoice(${c.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('choices', data, 'choices');
}

function showChoiceModal(id = null) {
  const modal = document.getElementById('choiceModal');
  const title = document.getElementById('choiceModalTitle');
  const form = document.getElementById('choiceForm');
  form.reset();
  document.getElementById('choiceId').value = id || '';
  if (id) {
    title.textContent = 'Edit Choice';
    showLoading();
    apiGet('/api/admin/choices/', id).then(c => {
      document.getElementById('choiceQuestion').value = c.question ? (typeof c.question === 'object' ? c.question.id : c.question) : '';
      document.getElementById('choiceTextUz').value = c.text || '';
      document.getElementById('choiceTextRu').value = '';
      document.getElementById('choiceTextEn').value = '';
      document.getElementById('choiceIsCorrect').checked = c.is_correct || false;
      document.getElementById('choiceIsActive').checked = true;
    }).catch(err => showToast('Failed to load choice: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Choice';
  }
  new bootstrap.Modal(modal).show();
}

async function saveChoice() {
  const id = document.getElementById('choiceId').value;
  const data = {
    question: parseInt(document.getElementById('choiceQuestion').value) || null,
    text: document.getElementById('choiceTextUz').value.trim(),
    is_correct: document.getElementById('choiceIsCorrect').checked
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/choices/', id, data);
      showToast('Choice updated');
    } else {
      await apiCreate('/api/admin/choices/', data);
      showToast('Choice created');
    }
    bootstrap.Modal.getInstance(document.getElementById('choiceModal')).hide();
    loadChoices(currentPages.choices || 1);
  } catch (err) {
    showToast('Failed to save choice: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteChoice(id) {
  if (!confirm('Delete this choice?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/choices/', id);
    showToast('Choice deleted');
    loadChoices(currentPages.choices || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== AUDIO TRACKS ====================

async function loadAudio(page = 1) {
  showLoading();
  try {
    applyFilters('audio');
    const params = { page, ...currentFilters.audio };
    const data = await apiList('/api/admin/audio-tracks/', params);
    currentPages.audio = page;
    renderAudio(data);
  } catch (err) {
    showToast('Failed to load audio: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderAudio(data) {
  const tbody = document.querySelector('#page-audio .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Audio trek topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.pool || a.section || '-'}</td>
      <td>${a.section || '-'}</td>
      <td>${a.audio_url || a.audio_file ? '<a href="' + (a.audio_url || a.audio_file) + '" target="_blank" class="btn btn-sm btn-outline-success"><i class="bi bi-play-circle"></i> Play</a>' : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showAudioModal(${a.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAudio(${a.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('audio', data, 'audio');
}

function showAudioModal(id = null) {
  const modal = document.getElementById('audioModal');
  const title = document.getElementById('audioModalTitle');
  const form = document.getElementById('audioForm');
  form.reset();
  document.getElementById('audioId').value = id || '';
  if (id) {
    title.textContent = 'Edit Audio Track';
    showLoading();
    apiGet('/api/admin/audio-tracks/', id).then(a => {
      document.getElementById('audioTitle').value = a.pool || '';
      document.getElementById('audioPart').value = a.section || 'listening';
    }).catch(err => showToast('Failed to load audio: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Upload Audio Track';
  }
  new bootstrap.Modal(modal).show();
}

async function saveAudio() {
  const id = document.getElementById('audioId').value;
  const file = document.getElementById('audioFile').files[0];
  const isFormData = !!file;
  const data = isFormData ? new FormData() : {
    pool: document.getElementById('audioTitle').value.trim(),
    section: document.getElementById('audioPart').value
  };
  if (isFormData) {
    data.append('pool', document.getElementById('audioTitle').value.trim());
    data.append('section', document.getElementById('audioPart').value);
    data.append('audio_file', file);
  }
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/audio-tracks/', id, data, isFormData);
      showToast('Audio track updated');
    } else {
      await apiCreate('/api/admin/audio-tracks/', data, isFormData);
      showToast('Audio track uploaded');
    }
    bootstrap.Modal.getInstance(document.getElementById('audioModal')).hide();
    loadAudio(currentPages.audio || 1);
  } catch (err) {
    showToast('Failed to save audio: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteAudio(id) {
  if (!confirm('Delete this audio track?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/audio-tracks/', id);
    showToast('Audio track deleted');
    loadAudio(currentPages.audio || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== NOTIFICATIONS ====================

async function loadNotifications(page = 1) {
  showLoading();
  try {
    applyFilters('notifications');
    const params = { page, ...currentFilters.notifications };
    const data = await apiList('/api/admin/notifications/', params);
    currentPages.notifications = page;
    renderNotifications(data);
  } catch (err) {
    showToast('Failed to load notifications: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderNotifications(data) {
  const tbody = document.querySelector('#page-notifications .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Bildirishnoma topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(n => `
    <tr class="${n.is_read ? '' : 'table-primary'}">
      <td>${n.id}</td>
      <td>All</td>
      <td>${truncateText(n.title || n.message || '', 40)}</td>
      <td>${n.type || 'info'}</td>
      <td>${n.is_read ? '<span class="badge bg-secondary">Read</span>' : '<span class="badge bg-primary">Unread</span>'}</td>
      <td>${formatDateTime(n.created_at)}</td>
      <td>
        ${!n.is_read ? `<button class="btn btn-sm btn-outline-secondary me-1" onclick="markRead(${n.id})" title="Mark Read"><i class="bi bi-check-lg"></i></button>` : ''}
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showNotificationModal(${n.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification(${n.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('notifications', data, 'notifications');
}

function showNotificationModal(id = null) {
  const modal = document.getElementById('notificationModal');
  const title = document.getElementById('notificationModalTitle');
  const form = document.getElementById('notificationForm');
  form.reset();
  document.getElementById('notificationId').value = id || '';
  if (id) {
    title.textContent = 'Edit Notification';
    showLoading();
    apiGet('/api/admin/notifications/', id).then(n => {
      document.getElementById('notificationUser').value = n.user ? (typeof n.user === 'object' ? n.user.id : n.user) : '';
      document.getElementById('notificationTitle').value = n.title || '';
      document.getElementById('notificationMessage').value = n.message || '';
      document.getElementById('notificationType').value = n.type || 'info';
    }).catch(err => showToast('Failed to load notification: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Send Notification';
  }
  new bootstrap.Modal(modal).show();
}

async function saveNotification() {
  const id = document.getElementById('notificationId').value;
  const data = {
    user: parseInt(document.getElementById('notificationUser').value) || null,
    title: document.getElementById('notificationTitle').value.trim(),
    message: document.getElementById('notificationMessage').value.trim(),
    type: document.getElementById('notificationType').value
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/notifications/', id, data);
      showToast('Notification updated');
    } else {
      await apiCreate('/api/admin/notifications/', data);
      showToast('Notification sent');
    }
    bootstrap.Modal.getInstance(document.getElementById('notificationModal')).hide();
    loadNotifications(currentPages.notifications || 1);
  } catch (err) {
    showToast('Failed to save notification: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteNotification(id) {
  if (!confirm('Delete this notification?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/notifications/', id);
    showToast('Notification deleted');
    loadNotifications(currentPages.notifications || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function markRead(id) {
  showLoading();
  try {
    await apiAction('/api/admin/notifications/', id, 'mark_read/');
    showToast('Marked as read');
    loadNotifications(currentPages.notifications || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function markAllRead() {
  showLoading();
  try {
    await apiPost('/api/admin/notifications/mark_all_read/', {});
    showToast('All marked as read');
    loadNotifications(currentPages.notifications || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== GRAMMAR MISTAKES ====================

async function loadGrammar(page = 1) {
  showLoading();
  try {
    applyFilters('grammar');
    const params = { page, ...currentFilters.grammar };
    const data = await apiList('/api/admin/grammar-mistakes/', params);
    currentPages.grammar = page;
    renderGrammar(data);
  } catch (err) {
    showToast('Failed to load grammar mistakes: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderGrammar(data) {
  const tbody = document.querySelector('#page-grammar .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Grammatik xato topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(g => `
    <tr>
      <td>${g.id}</td>
      <td>${g.user_fullname || g.user_username || g.user || '-'}</td>
      <td>${truncateText(g.topic || g.last_example || '', 40)}</td>
      <td>${g.mistake_count || '-'}</td>
      <td>${g.topic || '-'}</td>
      <td>${formatDateTime(g.last_seen)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showGrammarModal(${g.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteGrammar(${g.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('grammar', data, 'grammar');
}

function showGrammarModal(id = null) {
  const modal = document.getElementById('grammarModal');
  const title = document.getElementById('grammarModalTitle');
  const form = document.getElementById('grammarForm');
  form.reset();
  document.getElementById('grammarId').value = id || '';
  if (id) {
    title.textContent = 'Edit Grammar Mistake';
    showLoading();
    apiGet('/api/admin/grammar-mistakes/', id).then(g => {
      document.getElementById('grammarUser').value = g.user ? (typeof g.user === 'object' ? g.user.id : g.user) : '';
      document.getElementById('grammarOriginal').value = g.last_example || '';
      document.getElementById('grammarCorrected').value = '';
      document.getElementById('grammarMistakeType').value = g.topic || '';
    }).catch(err => showToast('Failed to load grammar: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Grammar Mistake';
  }
  new bootstrap.Modal(modal).show();
}

async function saveGrammar() {
  const id = document.getElementById('grammarId').value;
  const data = {
    user: parseInt(document.getElementById('grammarUser').value) || null,
    topic: document.getElementById('grammarMistakeType').value.trim() || 'general',
    last_example: document.getElementById('grammarOriginal').value.trim()
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/grammar-mistakes/', id, data);
      showToast('Grammar mistake updated');
    } else {
      await apiCreate('/api/admin/grammar-mistakes/', data);
      showToast('Grammar mistake created');
    }
    bootstrap.Modal.getInstance(document.getElementById('grammarModal')).hide();
    loadGrammar(currentPages.grammar || 1);
  } catch (err) {
    showToast('Failed to save grammar: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deleteGrammar(id) {
  if (!confirm('Delete this grammar mistake?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/grammar-mistakes/', id);
    showToast('Grammar mistake deleted');
    loadGrammar(currentPages.grammar || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== AI CHAT MESSAGES ====================

async function loadAiChat(page = 1) {
  showLoading();
  try {
    applyFilters('ai-chat');
    const params = { page, ...currentFilters['ai-chat'] };
    const data = await apiList('/api/admin/ai-chat-messages/', params);
    currentPages['ai-chat'] = page;
    renderAiChat(data);
  } catch (err) {
    showToast('Failed to load AI chat messages: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderAiChat(data) {
  const tbody = document.querySelector('#page-ai-chat .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Xabar topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(m => `
    <tr>
      <td>${m.id}</td>
      <td>${m.user || '-'}</td>
      <td><span class="badge bg-${m.role === 'ai' ? 'info' : 'secondary'}">${m.role || '-'}</span></td>
      <td><div class="text-truncate" style="max-width:200px">${m.content || m.message || '-'}</div></td>
      <td>${formatDateTime(m.created_at)}</td>
    </tr>
  `).join('');
  updatePagination('ai-chat', data, 'ai-chat');
}

// ==================== SUBSCRIPTION PLANS ====================

async function loadPlans(page = 1) {
  showLoading();
  try {
    applyFilters('plans');
    const params = { page, ...currentFilters.plans };
    const data = await apiList('/api/admin/subscription-plans/', params);
    currentPages.plans = page;
    renderPlans(data);
  } catch (err) {
    showToast('Failed to load plans: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderPlans(data) {
  const tbody = document.querySelector('#page-plans .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Reja topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name || '-'}</td>
      <td>${Number(p.price || 0).toLocaleString()} UZS</td>
      <td>${p.duration_days || '-'} days</td>
      <td>${p.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showPlanModal(${p.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePlan(${p.id})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('plans', data, 'plans');
}

function showPlanModal(id = null) {
  const modal = document.getElementById('planModal');
  const title = document.getElementById('planModalTitle');
  const form = document.getElementById('planForm');
  form.reset();
  document.getElementById('planId').value = id || '';
  if (id) {
    title.textContent = 'Edit Plan';
    showLoading();
    apiGet('/api/admin/subscription-plans/', id).then(p => {
      document.getElementById('planName').value = p.name || '';
      document.getElementById('planPrice').value = p.price || 0;
      document.getElementById('planDuration').value = p.duration_days || 30;
      document.getElementById('planIsActive').checked = p.is_active !== false;
    }).catch(err => showToast('Failed to load plan: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Plan';
  }
  new bootstrap.Modal(modal).show();
}

async function savePlan() {
  const id = document.getElementById('planId').value;
  const data = {
    name: document.getElementById('planName').value.trim(),
    price: parseFloat(document.getElementById('planPrice').value) || 0,
    duration_days: parseInt(document.getElementById('planDuration').value) || 30,
    is_active: document.getElementById('planIsActive').checked
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/subscription-plans/', id, data);
      showToast('Plan updated');
    } else {
      await apiCreate('/api/admin/subscription-plans/', data);
      showToast('Plan created');
    }
    bootstrap.Modal.getInstance(document.getElementById('planModal')).hide();
    loadPlans(currentPages.plans || 1);
  } catch (err) {
    showToast('Failed to save plan: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

async function deletePlan(id) {
  if (!confirm('Delete this plan?')) return;
  showLoading();
  try {
    await apiDelete('/api/admin/subscription-plans/', id);
    showToast('Plan deleted');
    loadPlans(currentPages.plans || 1);
  } catch (err) {
    showToast('Failed: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== USER SUBSCRIPTIONS ====================

async function loadSubscriptions(page = 1) {
  showLoading();
  try {
    applyFilters('subscriptions');
    const params = { page, ...currentFilters.subscriptions };
    const data = await apiList('/api/admin/user-subscriptions/', params);
    currentPages.subscriptions = page;
    renderSubscriptions(data);
  } catch (err) {
    showToast('Failed to load subscriptions: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderSubscriptions(data) {
  const tbody = document.querySelector('#page-subscriptions .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Obuna topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.user_fullname || s.user_username || s.user || '-'}</td>
      <td>${s.plan_name || s.plan || '-'}</td>
      <td><span class="badge bg-${s.status === 'active' ? 'success' : s.status === 'expired' ? 'danger' : 'secondary'}">${s.status || '-'}</span></td>
      <td>${formatDate(s.start_date)}</td>
      <td>${formatDate(s.end_date)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="showSubscriptionModal(${s.id})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-success me-1" onclick="showExtendModal(${s.id})" title="Extend"><i class="bi bi-calendar-plus"></i></button>
      </td>
    </tr>
  `).join('');
  updatePagination('subscriptions', data, 'subscriptions');
}

function showSubscriptionModal(id = null) {
  const modal = document.getElementById('subscriptionModal');
  const title = document.getElementById('subscriptionModalTitle');
  const form = document.getElementById('subscriptionForm');
  form.reset();
  document.getElementById('subscriptionId').value = id || '';
  if (id) {
    title.textContent = 'Edit Subscription';
    showLoading();
    apiGet('/api/admin/user-subscriptions/', id).then(s => {
      document.getElementById('subscriptionUser').value = s.user ? (typeof s.user === 'object' ? s.user.id : s.user) : '';
      const planVal = s.plan ? (typeof s.plan === 'object' ? s.plan.id : s.plan) : '';
      document.getElementById('subscriptionPlan').value = planVal;
      document.getElementById('subscriptionStatus').value = s.status || 'active';
      document.getElementById('subscriptionStartDate').value = s.start_date ? s.start_date.substring(0, 10) : '';
      document.getElementById('subscriptionEndDate').value = s.end_date ? s.end_date.substring(0, 10) : '';
    }).catch(err => showToast('Failed to load subscription: ' + (err.detail || err.message), 'danger'))
    .finally(() => hideLoading());
  } else {
    title.textContent = 'Create Subscription';
  }
  new bootstrap.Modal(modal).show();
}

async function saveSubscription() {
  const id = document.getElementById('subscriptionId').value;
  const data = {
    user: parseInt(document.getElementById('subscriptionUser').value) || null,
    plan: parseInt(document.getElementById('subscriptionPlan').value) || null,
    status: document.getElementById('subscriptionStatus').value,
    start_date: document.getElementById('subscriptionStartDate').value || null,
    end_date: document.getElementById('subscriptionEndDate').value || null
  };
  showLoading();
  try {
    if (id) {
      await apiUpdate('/api/admin/user-subscriptions/', id, data);
      showToast('Subscription updated');
    } else {
      await apiCreate('/api/admin/user-subscriptions/', data);
      showToast('Subscription created');
    }
    bootstrap.Modal.getInstance(document.getElementById('subscriptionModal')).hide();
    loadSubscriptions(currentPages.subscriptions || 1);
  } catch (err) {
    showToast('Failed to save subscription: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function showExtendModal(id) {
  document.getElementById('extendSubscriptionId').value = id;
  document.getElementById('extendDays').value = 30;
  new bootstrap.Modal(document.getElementById('extendModal')).show();
}

async function extendSubscription(id) {
  const days = parseInt(document.getElementById('extendDays').value) || 30;
  showLoading();
  try {
    await apiAction('/api/admin/user-subscriptions/', id, 'extend/', { days });
    showToast(`Subscription extended by ${days} days`);
    bootstrap.Modal.getInstance(document.getElementById('extendModal')).hide();
    loadSubscriptions(currentPages.subscriptions || 1);
  } catch (err) {
    showToast('Failed to extend: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

// ==================== VOICE USAGE LOGS ====================

async function loadVoiceLogs(page = 1) {
  showLoading();
  try {
    applyFilters('voice-logs');
    const params = { page, ...currentFilters['voice-logs'] };
    const data = await apiList('/api/admin/voice-usage-logs/', params);
    currentPages['voice-logs'] = page;
    renderVoiceLogs(data);
  } catch (err) {
    showToast('Failed to load voice logs: ' + (err.detail || err.message), 'danger');
  } finally {
    hideLoading();
  }
}

function renderVoiceLogs(data) {
  const tbody = document.querySelector('#page-voice-logs .table tbody');
  if (!tbody) return;
  const results = data.results || data;
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Ovoz jurnali topilmadi</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(v => `
    <tr>
      <td>${v.id}</td>
      <td>${v.user_fullname || v.user_username || v.user || '-'}</td>
      <td>${v.text ? truncateText(v.text, 50) : '-'}</td>
      <td>${v.language || '-'}</td>
      <td>${formatDateTime(v.created_at)}</td>
    </tr>
  `).join('');
  updatePagination('voice-logs', data, 'voice-logs');
}

// ==================== PAGINATION ====================

function updatePagination(pageKey, data) {
  const page = currentPages[pageKey] || 1;
  const count = data.count || 0;
  const totalPages = Math.ceil(count / 20) || 1;
  const info = document.querySelector(`#page-${pageKey} .pagination-info`);
  if (info) info.textContent = `${page} / ${totalPages} (jami: ${count})`;
  const prev = document.querySelector(`#page-${pageKey} .btn-prev`);
  const next = document.querySelector(`#page-${pageKey} .btn-next`);
  if (prev) {
    prev.disabled = !data.previous;
    prev.onclick = () => {
      if (page > 1) { currentPages[pageKey] = page - 1; loadPageData(pageKey); }
    };
  }
  if (next) {
    next.disabled = !data.next;
    next.onclick = () => {
      if (page < totalPages) { currentPages[pageKey] = page + 1; loadPageData(pageKey); }
    };
  }
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) { window.location.replace('login.html'); return; }
  document.getElementById('appContainer').style.display = 'block';
  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarClose = document.getElementById('sidebarCloseBtn');
  function openSidebar() { if (sidebar) sidebar.classList.add('open'); if (overlay) overlay.classList.add('show'); }
  function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (overlay) overlay.classList.remove('show'); }
  if (sidebarToggle) { sidebarToggle.onclick = () => { if (sidebar && sidebar.classList.contains('open')) closeSidebar(); else openSidebar(); }; }
  if (sidebarClose) { sidebarClose.onclick = closeSidebar; }
  if (overlay) { overlay.onclick = closeSidebar; }
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.onclick = handleLogout;
  // Load current page
  loadPageData();
  // Tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    try { new bootstrap.Tooltip(el); } catch (e) { /* ignore */ }
  });
});
