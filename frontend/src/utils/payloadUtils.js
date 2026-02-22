export function stripIdKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(item => stripIdKeys(item));
    return;
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'id')) delete obj.id;
  if (Object.prototype.hasOwnProperty.call(obj, 'pk')) delete obj.pk;
  Object.keys(obj).forEach(k => {
    try {
      if (obj[k] && typeof obj[k] === 'object') stripIdKeys(obj[k]);
    } catch (e) {
      // ignore
    }
  });
}

export function normalizeSection(obj, numericFields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  Object.keys(obj).forEach((k) => {
    let v = obj[k];
    if (/_in_word$|_by_word$/.test(k)) { out[k] = v; return; }
    if (Array.isArray(numericFields) && numericFields.includes(k)) {
      if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
        out[k] = 0;
      } else {
        const s = String(v).replace(/\./g, '').replace(/,/g, '').trim();
        const n = Number(s);
        out[k] = Number.isNaN(n) ? 0 : n;
      }
    } else {
      // Uppercase specific fields commonly used for vehicle/collateral identifiers
      try {
        const upperFields = new Set(['vehicle_model', 'plate_number', 'plat_number', 'chassis_number', 'engine_number']);
        if (typeof v === 'string' && upperFields.has(k)) {
          out[k] = v.toUpperCase();
        } else {
          out[k] = v;
        }
      } catch (e) {
        out[k] = v;
      }
    }
  });
  return out;
}
