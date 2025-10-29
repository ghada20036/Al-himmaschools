(function () {
  // يفصل الحقول مع مراعاة الاقتباسات
  function splitCSVLine(line) {
    return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (!lines.length) return [];
    const header = splitCSVLine(lines[0]).map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const cols = splitCSVLine(line);
      const obj = {};
      for (let j = 0; j < header.length; j++) {
        obj[header[j]] = cols[j] !== undefined ? cols[j] : '';
      }
      rows.push(obj);
    }
    return rows;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function fetchCSV(path) {
    const resp = await fetch(path, { cache: 'no-store' });
    if (!resp.ok) throw new Error('فشل تحميل CSV: ' + resp.status);
    const txt = await resp.text();
    return parseCSV(txt);
  }

  window.initFromCsv = async function (csvPath = '/data/students.csv') {
    try {
      const rows = await fetchCSV(csvPath);
      if (!rows.length) return [];

      window.allData = window.allData || [];

      const created = [];
      for (const r of rows) {
        if (!r.type) continue;

        const record = Object.assign({}, r);

        if (!record.id) record.id = record.student_id || generateId();
        if (!record.student_id) record.student_id = record.id;
        if (!record.timestamp) record.timestamp = new Date().toISOString();

        if (record.score) {
          const n = Number(record.score);
          if (!isNaN(n)) record.score = n;
        }
        if (record.amount_paid) {
          const n = Number(record.amount_paid);
          if (!isNaN(n)) record.amount_paid = n;
        }
        if (record.amount_remaining) {
          const n = Number(record.amount_remaining);
          if (!isNaN(n)) record.amount_remaining = n;
        }

        if (window.dataSdk && typeof window.dataSdk.create === 'function') {
          try {
            await window.dataSdk.create(record);
          } catch (err) {
            console.warn('dataSdk.create failed for record', record, err);
            if (!window.allData.find(x => x.id === record.id)) window.allData.push(record);
          }
        } else {
          if (!window.allData.find(x => x.id === record.id)) window.allData.push(record);
        }

        created.push(record);
      }

      try {
        if (typeof dataHandler !== 'undefined' && dataHandler && typeof dataHandler.onDataChanged === 'function') {
          dataHandler.onDataChanged(window.allData);
        }
      } catch (e) {}

      return created;
    } catch (err) {
      console.error('initFromCsv error', err);
      return [];
    }
  };
})();
