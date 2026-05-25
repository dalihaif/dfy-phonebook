/**
 * db.js - IndexedDB 封装（增删改查）
 * 数据库名：PhoneBookDB，版本：1
 * 主存储：contacts
 */
const DB_NAME = 'PhoneBookDB';
const DB_VERSION = 1;
const STORE_NAME = 'contacts';

let dbInstance = null;

/**
 * 打开/创建数据库
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('dept', 'dept', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 通用事务辅助
 */
function tx(storeName, mode) {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

/**
 * 新增联系人
 */
async function addContact(contact) {
  const store = await tx(STORE_NAME, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add(contact);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 批量新增联系人
 */
async function addContacts(contacts) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const results = [];
    contacts.forEach((c) => {
      const req = store.add(c);
      req.onsuccess = () => results.push(req.result);
    });
    transaction.oncomplete = () => resolve(results);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 更新联系人
 */
async function updateContact(contact) {
  const store = await tx(STORE_NAME, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(contact);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 删除联系人
 */
async function deleteContact(id) {
  const store = await tx(STORE_NAME, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 获取单个联系人
 */
async function getContact(id) {
  const store = await tx(STORE_NAME, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 获取全部联系人
 */
async function getAllContacts() {
  const store = await tx(STORE_NAME, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 按索引查询
 */
async function getByIndex(indexName, value) {
  const store = await tx(STORE_NAME, 'readonly');
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 清空所有数据
 */
async function clearAll() {
  const store = await tx(STORE_NAME, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * 统计总数
 */
async function countContacts() {
  const store = await tx(STORE_NAME, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
