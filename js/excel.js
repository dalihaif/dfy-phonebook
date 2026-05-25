/**
 * excel.js - 导入/导出核心逻辑
 * 依赖：SheetJS (xlsx.full.min.js)
 */

/**
 * 从 Excel 文件导入联系人
 * 支持列映射：姓名/分类/部门/职称/职级/职务/办公电话/手机/短号
 */
function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const contacts = rows.map((row) => ({
          name: row['姓名'] || row['name'] || '',
          category: row['分类'] || row['category'] || '行政后勤',
          dept: row['部门'] || row['dept'] || '',
          title: row['职称'] || row['title'] || '',
          rank: row['职级'] || row['rank'] || '',
          position: row['职务'] || row['position'] || '',
          phone: String(row['办公电话'] || row['phone'] || ''),
          mobile: String(row['手机'] || row['手机号码'] || row['mobile'] || ''),
          shortphone: String(row['短号'] || row['shortphone'] || ''),
          createdAt: new Date().toISOString()
        })).filter((c) => c.name.trim() !== '');

        resolve(contacts);
      } catch (err) {
        reject(new Error('Excel 解析失败：' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 导出联系人到 Excel 文件
 */
async function exportToExcel(contacts) {
  if (!contacts || contacts.length === 0) {
    throw new Error('没有可导出的数据');
  }

  const exportData = contacts.map((c, i) => ({
    '序号': i + 1,
    '姓名': c.name,
    '分类': c.category || '行政后勤',
    '部门': c.dept,
    '职称': c.title || '',
    '职级': c.rank || '',
    '职务': c.position || '',
    '办公电话': c.phone || '',
    '手机号码': c.mobile || '',
    '短号': c.shortphone || ''
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '通讯录');
  XLSX.writeFile(wb, `通讯录_${formatDate()}.xlsx`);
}

/**
 * 下载模板文件
 */
function downloadTemplate() {
  const headers = ['姓名', '分类', '部门', '职称', '职级', '职务', '办公电话', '手机号码', '短号'];
  const examples = [
    ['张三', '行政后勤', '信息科', '主治医师', '中级', '科主任', '0872-1234567', '13800138000', '6001'],
    ['李四', '临床科室', '心内科', '主任医师', '正高级', '护士长', '0872-7654321', '13900139000', '6002']
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 16 },
    { wch: 12 }, { wch: 10 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 8 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');
  XLSX.writeFile(wb, '通讯录导入模板.xlsx');
}

function formatDate() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
