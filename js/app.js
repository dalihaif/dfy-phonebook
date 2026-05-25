/**
 * app.js - 大理大学第一附属医院通讯录
 * 完整版：密码登录 / 联系人管理 / PWA / 导入导出
 */

document.addEventListener('DOMContentLoaded', init);

/* ==================== PWA 安装拦截 ==================== */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (deferredPrompt) {
      document.getElementById('install-banner').classList.remove('hidden');
    }
  }, 4000);
});

/* ==================== SW 注册 ==================== */
let swRegistration = null;

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then((reg) => {
      swRegistration = reg;
      // 检测更新
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('update-banner').classList.remove('hidden');
          }
        });
      });
      // 每小时检查更新
      setInterval(() => reg.update(), 60 * 60 * 1000);
    }).catch((err) => {
      console.warn('SW 注册失败:', err);
    });
  }
}

/* ==================== PWA 安装 ==================== */
async function handleInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('已添加到主屏幕 🎉');
  }
  deferredPrompt = null;
  document.getElementById('install-banner').classList.add('hidden');
}

/* ==================== 离线 / 在线检测 ==================== */
function detectInitialOnline() {
  if (!navigator.onLine) {
    document.getElementById('offline-banner').classList.remove('hidden');
  }
}

window.addEventListener('online', () => {
  document.getElementById('offline-banner').classList.add('hidden');
  showToast('网络已恢复 ✓');
});
window.addEventListener('offline', () => {
  document.getElementById('offline-banner').classList.remove('hidden');
});

/* ==================== 闪屏消失 ==================== */
function dismissSplash() {
  const splash = document.getElementById('splash-screen');
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 800);
}

/* ==================== 主初始化 ==================== */
async function init() {
  initPermission();          // 权限系统
  bindGlobalEvents();         // 全局事件
  bindLoginModalEvents();     // 登录弹窗事件
  await loadContacts();       // 加载数据
  registerSW();
  dismissSplash();
  detectInitialOnline();
}

/* ==================== 全局事件绑定 ==================== */
function bindGlobalEvents() {
  // 搜索
  document.getElementById('btn-search').addEventListener('click', toggleSearch);
  document.getElementById('search-input').addEventListener('input', debounce(filterContacts, 250));
  document.getElementById('search-clear').addEventListener('click', clearSearch);

  // 筛选
  document.getElementById('filter-dept').addEventListener('change', filterContacts);
  document.getElementById('filter-category').addEventListener('change', filterContacts);

  // 底部操作
  document.getElementById('btn-login-footer').addEventListener('click', () => {
    openLoginModal();
  });

  document.getElementById('btn-import-footer').addEventListener('click', () => {
    if (!requirePermission('canImport', '需要编辑者或管理员权限')) return;
    document.getElementById('file-input').click();
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    if (!requirePermission('canExport', '需要编辑者或管理员权限')) return;
    handleExport();
  });

  document.getElementById('btn-add').addEventListener('click', () => {
    if (!requirePermission('canAdd', '需要编辑者或管理员权限')) return;
    openModal();
  });

  // 批量删除
  document.getElementById('btn-batch-delete').addEventListener('click', enterBatchMode);
  document.getElementById('batch-delete-btn').addEventListener('click', handleBatchDelete);
  document.getElementById('batch-cancel-btn').addEventListener('click', exitBatchMode);
  document.getElementById('batch-select-all').addEventListener('change', handleBatchSelectAll);
  document.getElementById('batch-confirm-cancel').addEventListener('click', closeBatchConfirmModal);
  document.getElementById('batch-confirm-ok').addEventListener('click', confirmBatchDelete);

  // 空状态导入
  document.getElementById('btn-import').addEventListener('click', () => {
    if (!requirePermission('canImport', '需要编辑者或管理员权限')) return;
    document.getElementById('file-input').click();
  });

  // 文件选择
  document.getElementById('file-input').addEventListener('change', handleImport);

  // 编辑模态框
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('contact-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-delete').addEventListener('click', handleDelete);

  // 确认删除模态框
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
  document.getElementById('confirm-ok').addEventListener('click', confirmDelete);

  // 修改密码模态框
  document.getElementById('change-pwd-cancel').addEventListener('click', closeChangePwdModal);
  document.getElementById('change-pwd-close').addEventListener('click', closeChangePwdModal);
  document.getElementById('change-pwd-ok').addEventListener('click', handleChangePwd);
  document.getElementById('change-pwd-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeChangePwdModal();
  });

  // PWA
  document.getElementById('btn-install').addEventListener('click', handleInstall);
  document.getElementById('btn-install-dismiss').addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
  });
  document.getElementById('btn-update').addEventListener('click', () => {
    window.location.reload();
  });

  // ESC 关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeLoginModal();
      closeConfirmModal();
      closeBatchConfirmModal();
      closeChangePwdModal();
    }
  });
}

/* ==================== 登录模态框 ==================== */
let selectedLoginRole = null;
let pendingDeleteId    = null;
let batchMode         = false;
let selectedBatchIds  = new Set();

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('hidden');
  selectedLoginRole = null;
  document.getElementById('login-form-area').classList.add('hidden');
  document.getElementById('login-roles').classList.remove('hidden');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('login-password').value = '';
  // 清除角色选中态
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

function bindLoginModalEvents() {
  const modal = document.getElementById('login-modal');
  if (!modal) { console.error('[登录] 找不到 login-modal 元素'); return; }

  const rolesArea  = document.getElementById('login-roles');
  const formArea   = document.getElementById('login-form-area');
  const roleNameEl = document.getElementById('login-role-name');
  const errorEl    = document.getElementById('login-error');
  const passwordInput = document.getElementById('login-password');
  const submitBtn  = document.getElementById('login-submit');

  if (!rolesArea || !formArea || !roleNameEl || !errorEl || !passwordInput || !submitBtn) {
    console.error('[登录] 关键元素缺失', { rolesArea, formArea, roleNameEl, errorEl, passwordInput, submitBtn });
    return;
  }

  document.getElementById('login-close').addEventListener('click', closeLoginModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLoginModal();
  });

  // 角色选择
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedLoginRole = card.dataset.role;
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const names = { admin: '管理员', editor: '编辑者' };
      roleNameEl.textContent = names[selectedLoginRole] || selectedLoginRole;
      rolesArea.classList.add('hidden');
      formArea.classList.remove('hidden');
      passwordInput.value = '';
      errorEl.classList.add('hidden');
      setTimeout(() => passwordInput.focus(), 100);
    });
  });

  // 返回重新选择
  document.getElementById('login-back').addEventListener('click', () => {
    formArea.classList.add('hidden');
    rolesArea.classList.remove('hidden');
    selectedLoginRole = null;
    errorEl.classList.add('hidden');
  });

  // 提交登录
  function doLogin() {
    const pwd = passwordInput.value.trim();
    if (!pwd) {
      errorEl.textContent = '请输入密码';
      errorEl.classList.remove('hidden');
      passwordInput.focus();
      return;
    }
    if (!selectedLoginRole) return;

    if (attemptLogin(selectedLoginRole, pwd)) {
      closeLoginModal();
      const names = { admin: '管理员', editor: '编辑者' };
      showToast(`欢迎，${names[selectedLoginRole]}！`);
    } else {
      errorEl.textContent = '密码错误，请重新输入';
      errorEl.classList.remove('hidden');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }

  submitBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}

/* ==================== 数据加载 ==================== */
let allContacts = [];

async function loadContacts() {
  const count = await countContacts();
  if (count === 0) {
    try {
      const resp = await fetch('data/sample-data.json');
      const sampleData = await resp.json();
      await addContacts(sampleData);
    } catch (err) {
      console.warn('加载示例数据失败:', err);
    }
  }
  allContacts = await getAllContacts();
  renderList(allContacts);
  populateFilters(allContacts);
  toggleEmptyState(allContacts);
  updateContactCount(allContacts);
}

/* ==================== 联系人计数 ==================== */
function updateContactCount(contacts) {
  const el = document.getElementById('contact-count');
  if (!el) return;
  if (contacts.length === allContacts.length) {
    el.textContent = `${allContacts.length} 人`;
  } else {
    el.textContent = `${contacts.length}/${allContacts.length}`;
  }
}

/* ==================== 渲染列表 ==================== */
function renderList(contacts) {
  const container = document.getElementById('contact-list');
  if (!contacts || contacts.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = contacts.map((c) => {
    const initials = getInitials(c.name);
    const phones = buildPhoneLinks(c);
    const checked = selectedBatchIds.has(c.id) ? 'checked' : '';
    const checkboxHtml = batchMode
      ? `<input type="checkbox" class="batch-checkbox" data-id="${c.id}" ${checked}>`
      : '';
    return `
      <div class="contact-card${batchMode ? ' batch-mode' : ''}"
           data-id="${c.id}"
           data-category="${escapeHtml(c.category || '')}">
        ${checkboxHtml}
        <div class="contact-avatar">${initials}</div>
        <div class="contact-info">
          <div class="contact-name-row">
            <span class="contact-name">${escapeHtml(c.name)}</span>
            ${categoryBadge(c.category)}
          </div>
          <div class="contact-dept">${escapeHtml(c.dept || '')}</div>
          ${c.title || c.rank
            ? `<div class="contact-title">${[c.title, c.rank].filter(Boolean).join(' · ')}</div>`
            : ''}
          ${c.position ? `<div class="contact-position">${escapeHtml(c.position)}</div>` : ''}
        </div>
        <div class="contact-phones">${phones}</div>
      </div>
    `;
  }).join('');

  // 卡片点击 -> 批量模式勾选 / 普通模式打开编辑
  container.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (batchMode) {
        // 批量模式下点击卡片切换勾选
        const cb = card.querySelector('.batch-checkbox');
        if (cb && e.target !== cb) {
          cb.checked = !cb.checked;
        }
        if (cb) {
          const id = Number(cb.dataset.id);
          if (cb.checked) {
            selectedBatchIds.add(id);
          } else {
            selectedBatchIds.delete(id);
          }
        }
        updateBatchCount();
        return;
      }
      // 点击电话链接不打开编辑
      if (e.target.closest('.phone-link')) return;
      const id = Number(card.dataset.id);
      openModal(id);
    });
  });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function buildPhoneLinks(c) {
  let html = '';
  if (c.mobile) {
    html += `<a href="tel:${c.mobile}" class="phone-link mobile">📱 ${escapeHtml(c.mobile)}</a>`;
  }
  if (c.phone) {
    html += `<a href="tel:${c.phone}" class="phone-link">☎️ ${escapeHtml(c.phone)}</a>`;
  }
  if (c.shortphone) {
    html += `<a href="tel:${c.shortphone}" class="phone-link short">🔗 ${escapeHtml(c.shortphone)}</a>`;
  }
  return html;
}

function categoryBadge(category) {
  if (!category) return '';
  return `<span class="badge badge-${category}">${escapeHtml(category)}</span>`;
}

/* ==================== 筛选 ==================== */
function populateFilters(contacts) {
  const deptSet = new Set(contacts.map(c => c.dept).filter(Boolean));
  const catSet  = new Set(contacts.map(c => c.category).filter(Boolean));
  fillSelect('filter-dept', deptSet, '全部部门');
  fillSelect('filter-category', catSet, '全部分类');
}

function fillSelect(id, values, defaultLabel) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  sel.innerHTML = `<option value="">${defaultLabel}</option>`;
  [...values].sort().forEach(v => {
    sel.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  });
  sel.value = cur;
}

function filterContacts() {
  const keyword  = (document.getElementById('search-input').value || '').trim().toLowerCase();
  const dept     = document.getElementById('filter-dept').value;
  const category = document.getElementById('filter-category').value;

  const filtered = allContacts.filter(c => {
    if (dept && c.dept !== dept) return false;
    if (category && c.category !== category) return false;
    if (keyword) {
      const s = `${c.name}${c.dept}${c.phone}${c.mobile}${c.shortphone}${c.position}${c.title||''}${c.rank||''}`.toLowerCase();
      // 支持拼音缩写搜索：如果关键词不含中文，额外检查拼音首字母匹配
      const textMatch = s.includes(keyword);
      const pinyinMatch = !textMatch && !/[\u4e00-\u9fff]/.test(keyword) && typeof getPinyinInitials === 'function' && getPinyinInitials(`${c.name}${c.dept}${c.position||''}${c.title||''}`).toLowerCase().includes(keyword);
      if (!textMatch && !pinyinMatch) return false;
    }
    return true;
  });

  renderList(filtered);
  updateContactCount(filtered);
}

/* ==================== 搜索 ==================== */
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) {
    document.getElementById('search-input').focus();
  }
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  filterContacts();
}

/* ==================== 模态框 - 打开 / 关闭 ==================== */
async function openModal(id) {
  const overlay  = document.getElementById('modal-overlay');
  const title    = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('btn-delete');
  const form     = document.getElementById('contact-form');

  form.reset();
  document.getElementById('form-id').value = '';

  if (id) {
    const contact = await getContact(id);
    if (!contact) return;

    title.textContent = '✏️ 编辑联系人';
    document.getElementById('form-id').value = contact.id;
    document.getElementById('form-name').value = contact.name || '';
    document.getElementById('form-category').value = contact.category || '行政后勤';
    document.getElementById('form-dept').value = contact.dept || '';
    document.getElementById('form-title').value = contact.title || '';
    document.getElementById('form-rank').value = contact.rank || '';
    document.getElementById('form-position').value = contact.position || '';
    document.getElementById('form-phone').value = contact.phone || '';
    document.getElementById('form-mobile').value = contact.mobile || '';
    document.getElementById('form-shortphone').value = contact.shortphone || '';

    deleteBtn.classList.toggle('hidden', !hasPermission('canDelete'));
  } else {
    title.textContent = '➕ 新增联系人';
    deleteBtn.classList.add('hidden');
  }

  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ==================== 表单提交 ==================== */
async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const contact = {
    name:       document.getElementById('form-name').value.trim(),
    category:   document.getElementById('form-category').value,
    dept:       document.getElementById('form-dept').value.trim(),
    title:      document.getElementById('form-title').value.trim(),
    rank:       document.getElementById('form-rank').value.trim(),
    position:   document.getElementById('form-position').value.trim(),
    phone:      document.getElementById('form-phone').value.trim(),
    mobile:     document.getElementById('form-mobile').value.trim(),
    shortphone: document.getElementById('form-shortphone').value.trim()
  };

  if (!contact.name || !contact.dept) {
    showToast('姓名和部门不能为空');
    return;
  }

  if (id) {
    if (!requirePermission('canEdit', '需要编辑者或管理员权限')) return;
    contact.id = Number(id);
    await updateContact(contact);
    showToast('联系人已更新 ✓');
  } else {
    if (!requirePermission('canAdd', '需要编辑者或管理员权限')) return;
    contact.createdAt = new Date().toISOString();
    await addContact(contact);
    showToast('联系人已添加 ✓');
  }

  closeModal();
  await refreshList();
}

async function refreshList() {
  allContacts = await getAllContacts();
  filterContacts();
  populateFilters(allContacts);
  toggleEmptyState(allContacts);
}

/* ==================== 删除（确认流程） ==================== */
async function handleDelete() {
  if (!requirePermission('canDelete', '需要管理员权限')) return;
  const id = Number(document.getElementById('form-id').value);
  if (!id) return;

  // 保存待删除ID，打开确认框
  pendingDeleteId = id;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  pendingDeleteId = null;
}

async function confirmDelete() {
  const id = pendingDeleteId;
  if (!id) return;

  await deleteContact(id);
  closeConfirmModal();
  closeModal();
  showToast('联系人已删除');
  await refreshList();
}

/* ==================== 导入 ==================== */
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const contacts = await importFromExcel(file);
    if (!contacts || contacts.length === 0) {
      showToast('未识别到有效数据');
      return;
    }
    await addContacts(contacts);
    showToast(`成功导入 ${contacts.length} 条联系人 ✓`);
    await refreshList();
  } catch (err) {
    showToast('导入失败：' + err.message);
  }
  e.target.value = '';
}

/* ==================== 导出 ==================== */
async function handleExport() {
  try {
    const contacts = await getAllContacts();
    await exportToExcel(contacts);
    showToast(`已导出 ${contacts.length} 条联系人 ✓`);
  } catch (err) {
    showToast('导出失败：' + err.message);
  }
}

/* ==================== 空状态 ==================== */
function toggleEmptyState(contacts) {
  const empty = document.getElementById('empty-state');
  const list  = document.getElementById('contact-list');
  if (!contacts || contacts.length === 0) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
  } else {
    empty.classList.add('hidden');
    list.classList.remove('hidden');
  }
}

/* ==================== 工具函数 ==================== */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ==================== 批量删除 ==================== */
function enterBatchMode() {
  if (!requireAdmin('批量删除需要管理员权限')) return;
  batchMode = true;
  selectedBatchIds.clear();
  document.getElementById('batch-bar').classList.remove('hidden');
  document.querySelector('.app-footer').classList.add('hidden');
  document.getElementById('batch-select-all').checked = false;
  updateBatchCount();
  // 重新渲染列表以显示checkbox
  filterContacts();
}

function exitBatchMode() {
  batchMode = false;
  selectedBatchIds.clear();
  document.getElementById('batch-bar').classList.add('hidden');
  document.querySelector('.app-footer').classList.remove('hidden');
  document.getElementById('batch-select-all').checked = false;
  // 重新渲染列表
  filterContacts();
}

function updateBatchCount() {
  const countEl = document.getElementById('batch-count');
  const deleteBtn = document.getElementById('batch-delete-btn');
  const n = selectedBatchIds.size;
  countEl.textContent = `已选 ${n} 项`;
  deleteBtn.disabled = n === 0;
}

function handleBatchSelectAll(e) {
  const checked = e.target.checked;
  const container = document.getElementById('contact-list');
  container.querySelectorAll('.batch-checkbox').forEach(cb => {
    cb.checked = checked;
    const id = Number(cb.dataset.id);
    if (checked) {
      selectedBatchIds.add(id);
    } else {
      selectedBatchIds.delete(id);
    }
  });
  updateBatchCount();
}

function handleBatchDelete() {
  if (selectedBatchIds.size === 0) return;
  const n = selectedBatchIds.size;
  document.getElementById('batch-confirm-text').textContent =
    `确定要删除选中的 ${n} 项联系人吗？此操作不可恢复！`;
  document.getElementById('batch-confirm-modal').classList.remove('hidden');
}

function closeBatchConfirmModal() {
  document.getElementById('batch-confirm-modal').classList.add('hidden');
}

async function confirmBatchDelete() {
  const ids = [...selectedBatchIds];
  closeBatchConfirmModal();
  let success = 0;
  let fail = 0;
  for (const id of ids) {
    try {
      await deleteContact(id);
      success++;
    } catch (err) {
      console.error('删除失败 id=' + id, err);
      fail++;
    }
  }
  exitBatchMode();
  await refreshList();
  if (fail === 0) {
    showToast(`已删除 ${success} 条联系人 ✓`);
  } else {
    showToast(`删除 ${success} 条成功，${fail} 条失败`);
  }
}

/* ==================== 修改密码 ==================== */
function openChangePwdModal() {
  document.getElementById('change-pwd-modal').classList.remove('hidden');
  document.getElementById('pwd-old').value = '';
  document.getElementById('pwd-new').value = '';
  document.getElementById('pwd-confirm').value = '';
  document.getElementById('change-pwd-error').classList.add('hidden');
}

function closeChangePwdModal() {
  document.getElementById('change-pwd-modal').classList.add('hidden');
}

function handleChangePwd() {
  const oldPwd     = document.getElementById('pwd-old').value.trim();
  const newPwd     = document.getElementById('pwd-new').value.trim();
  const confirmPwd = document.getElementById('pwd-confirm').value.trim();
  const errorEl    = document.getElementById('change-pwd-error');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  if (!oldPwd) { showError('请输入旧密码'); return; }
  if (!newPwd) { showError('请输入新密码'); return; }
  if (newPwd.length < 4) { showError('新密码至少4位'); return; }
  if (newPwd !== confirmPwd) { showError('两次输入的新密码不一致'); return; }

  // 验证旧密码
  if (!verifyPassword(currentRole, oldPwd)) {
    showError('旧密码错误');
    return;
  }

  // 更新密码
  changePassword(currentRole, newPwd);
  closeChangePwdModal();
  showToast('密码修改成功 ✓');
}
