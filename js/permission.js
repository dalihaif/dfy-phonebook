/**
 * permission.js - 密码登录式权限管理系统
 *
 * 角色体系：
 * - viewer : 默认游客，无需登录，仅查看和拨号
 * - editor : 编辑者，需输入密码，可增改查、导入
 * - admin  : 管理员，需输入密码，全权限含删除
 *
 * 登录凭证存储于 localStorage，浏览器关闭后需重新登录
 * 密码存储于 localStorage (phonebook_pwd_<role>)，首次使用默认密码
 */

const ROLES = {
  admin:  { label: '管理员', canAdd: true,  canEdit: true,  canDelete: true,  canImport: true,  canExport: true },
  editor: { label: '编辑者', canAdd: true,  canEdit: true,  canDelete: false, canImport: true,  canExport: true },
  viewer: { label: '查看者', canAdd: false, canEdit: false, canDelete: false, canImport: false, canExport: false }
};

const DEFAULT_PASSWORDS = {
  admin:  'admin2025',
  editor: 'editor2025'
};

const KEYS = {
  role:   'phonebook_role',
  login:  'phonebook_logged_in',
  pwdPrefix: 'phonebook_pwd_'
};

let currentRole = 'viewer';
let isLoggedIn  = false;

/* ===================== 密码管理 ===================== */

/**
 * 获取角色密码（优先从 localStorage 读取自定义密码，否则使用默认密码）
 */
function getPassword(role) {
  const stored = localStorage.getItem(KEYS.pwdPrefix + role);
  return stored || DEFAULT_PASSWORDS[role] || '';
}

/**
 * 验证密码是否正确
 */
function verifyPassword(role, pwd) {
  if (!ROLES[role]) return false;
  return getPassword(role) === pwd;
}

/**
 * 修改密码
 */
function changePassword(role, newPwd) {
  if (!ROLES[role]) return false;
  localStorage.setItem(KEYS.pwdPrefix + role, newPwd);
  return true;
}

/* ===================== 初始化 ===================== */
function initPermission() {
  const savedRole = localStorage.getItem(KEYS.role) || 'viewer';
  const loginState = localStorage.getItem(KEYS.login);

  if (savedRole === 'viewer') {
    currentRole = 'viewer';
    isLoggedIn  = false;
  } else if (loginState === 'true') {
    currentRole = savedRole;
    isLoggedIn  = true;
  } else {
    currentRole = 'viewer';
    isLoggedIn  = false;
  }

  applyPermission();
  renderLoginStatus();
}

/* ===================== 登录 / 登出 ===================== */

/**
 * 尝试登录
 * @param {string} role  - 'admin' | 'editor'
 * @param {string} pwd   - 用户输入的密码
 * @returns {boolean} 登录是否成功
 */
function attemptLogin(role, pwd) {
  if (!ROLES[role]) return false;
  if (!verifyPassword(role, pwd)) return false;

  currentRole = role;
  isLoggedIn  = true;
  localStorage.setItem(KEYS.role, role);
  localStorage.setItem(KEYS.login, 'true');

  applyPermission();
  renderLoginStatus();
  return true;
}

/**
 * 登出当前账号，回到 viewer
 */
function logout() {
  currentRole = 'viewer';
  isLoggedIn  = false;
  localStorage.removeItem(KEYS.role);
  localStorage.removeItem(KEYS.login);

  applyPermission();
  renderLoginStatus();
  showToast('已退出登录');
}

/**
 * 获取当前登录角色（未登录时为 null）
 */
function getLoggedRole() {
  return isLoggedIn ? currentRole : null;
}

/* ===================== UI 控制 ===================== */

/**
 * 根据当前角色控制 UI 元素可见性
 */
function applyPermission() {
  const config = ROLES[currentRole];

  // 底部操作栏
  const btnAdd    = document.getElementById('btn-add');
  const btnImport = document.getElementById('btn-import-footer');
  const btnExport = document.getElementById('btn-export');
  const btnLoginFooter = document.getElementById('btn-login-footer');
  const btnBatchDelete = document.getElementById('btn-batch-delete');

  if (btnAdd)    btnAdd.classList.toggle('hidden', !config.canAdd);
  if (btnImport) btnImport.classList.toggle('hidden', !config.canImport);
  if (btnExport) btnExport.classList.toggle('hidden', !config.canExport);

  // 批量删除仅管理员可见
  if (btnBatchDelete) btnBatchDelete.classList.toggle('hidden', currentRole !== 'admin');

  // viewer 模式下显示 footer 登录按钮
  if (btnLoginFooter) btnLoginFooter.classList.toggle('hidden', isLoggedIn);

  // 空状态导入按钮
  const emptyImport = document.getElementById('btn-import');
  if (emptyImport) emptyImport.classList.toggle('hidden', !config.canImport);
}

/**
 * 在头部渲染登录状态指示器
 */
function renderLoginStatus() {
  const container = document.getElementById('login-status');
  if (!container) return;

  if (isLoggedIn) {
    const roleConfig = ROLES[currentRole];
    const icons  = { admin: '👑', editor: '✏️' };
    const labels = { admin: '管理员', editor: '编辑者' };
    // 管理员额外显示修改密码按钮
    const changePwdBtn = currentRole === 'admin'
      ? `<button id="btn-change-pwd" class="icon-btn change-pwd-btn" title="修改密码">🔑</button>`
      : '';
    container.innerHTML = `
      <span class="login-badge login-badge-${currentRole}">
        ${icons[currentRole]} ${labels[currentRole]}
      </span>
      ${changePwdBtn}
      <button id="btn-logout" class="icon-btn logout-btn" title="退出登录">🚪</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', logout);
    const changePwdEl = document.getElementById('btn-change-pwd');
    if (changePwdEl) {
      changePwdEl.addEventListener('click', function() {
        if (typeof openChangePwdModal === 'function') {
          openChangePwdModal();
        }
      });
    }
  } else {
    container.innerHTML = `
      <button id="btn-login" class="icon-btn login-btn" title="登录管理">🔐</button>
    `;
    document.getElementById('btn-login').addEventListener('click', function() {
      if (typeof openLoginModal === 'function') {
        openLoginModal();
      } else {
        console.error('[权限] openLoginModal 未定义');
      }
    });
  }
}

/* ===================== 权限检查 ===================== */

function getCurrentRole()  { return currentRole; }
function getRoleConfig()   { return ROLES[currentRole]; }

function hasPermission(action) {
  return !!ROLES[currentRole][action];
}

function requirePermission(action, msg) {
  if (hasPermission(action)) return true;
  showToast(msg || `当前${ROLES[currentRole].label}角色无此权限`);
  return false;
}

/**
 * 管理员操作二次验证（如删除）
 * @returns {boolean}
 */
function requireAdmin(msg) {
  if (currentRole === 'admin') return true;
  showToast(msg || '此操作需要管理员权限');
  return false;
}
