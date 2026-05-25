/**
 * service-worker.js - 大理大学第一附属医院通讯录
 * PWA 增强版：版本管理 / 增量更新 / 推送通知 / 离线优先
 */

const CACHE_VERSION = 'v20260525a';       // 每次发布更新此版本号
const CACHE_NAME    = `phonebook-${CACHE_VERSION}`;
const DATA_CACHE    = `phonebook-data-${CACHE_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/excel.js',
  '/js/permission.js',
  '/js/pinyin.js',
  '/lib/xlsx.full.min.js',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/data/sample-data.json'
];

/* ==================== 安装：预缓存 App Shell ==================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[SW] 部分资源缓存失败:', err);
      });
    })
  );
  // 立即激活新 SW
  self.skipWaiting();
  console.log('[SW] 已安装', CACHE_NAME);
});

/* ==================== 激活：清理旧缓存 ==================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('phonebook-') && k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => {
            console.log('[SW] 清理旧缓存:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      // 立即接管所有客户端
      self.clients.claim();
      console.log('[SW] 已激活', CACHE_NAME);
    })
  );
});

/* ==================== 请求拦截 ==================== */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理同源请求
  if (url.origin !== location.origin) return;

  // 1. 导航请求：网络优先，回退首页缓存（支持 SPA）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(r => r || caches.match('/'))
        )
    );
    return;
  }

  // 2. 静态资源（css / js / img / json / fonts）：缓存优先，渐进更新
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. 其他 GET 请求：网络优先，缓存回退
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});

function isStaticAsset(pathname) {
  return (
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/.test(pathname) ||
    pathname.startsWith('/lib/')    ||
    pathname.startsWith('/icons/')   ||
    pathname.startsWith('/data/')
  );
}

/* ==================== 后台同步 ==================== */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contacts') {
    event.waitUntil(syncContacts());
  }
});

async function syncContacts() {
  console.log('[SW] 后台同步触发（可对接云端API）');
  // TODO: 对接后端 API 实现数据同步
}

/* ==================== 推送通知 ==================== */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '通讯录', body: event.data.text() };
  }

  const options = {
    title: data.title || '通讯录',
    body:  data.body  || '',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100, 50, 100],
    tag: 'phonebook-notify',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '查看' },
      { action: 'dismiss', title: '忽略' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 聚焦已打开的窗口
      for (const client of clients) {
        if (client.url.includes('/index.html') && 'focus' in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      // 没有则打开新窗口
      return self.clients.openWindow(targetUrl);
    })
  );
});

/* ==================== 消息通信（可选） ==================== */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
