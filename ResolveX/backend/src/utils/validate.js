const DOMAIN_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$/;

function isValidDomain(d) {
  if (typeof d !== 'string') return false;
  const s = d.trim().toLowerCase();
  if (s.length < 3 || s.length > 253) return false;
  return DOMAIN_RE.test(s);
}

function isValidIp(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  // Reject leading zeros ("01.02.03.04"): c-ares can interpret them as octal
  // or reject them, which would surface as a confusing DNS error later.
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    if (p.length > 1 && p.startsWith('0')) return false;
    return Number(p) >= 0 && Number(p) <= 255;
  });
}

function validateTestBody(body, maxTests) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Request body must be JSON.'];
  const { domain, servers, tests, timeout } = body;

  if (!isValidDomain(domain || '')) {
    errors.push('Invalid domain. Example of a valid domain: google.com');
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    errors.push('Select at least one DNS server.');
  } else if (servers.length > 10) {
    errors.push('Too many servers selected (max 10).');
  } else {
    servers.forEach((s, i) => {
      if (!s || typeof s.name !== 'string' || !s.name.trim()) errors.push(`Server #${i + 1}: missing name.`);
      if (!s || !isValidIp(s.ip || '')) errors.push(`Server #${i + 1}: invalid IP address "${s && s.ip}".`);
    });
  }
  const n = Number(tests);
  if (!Number.isInteger(n) || n < 1 || n > (maxTests || 30)) {
    errors.push(`Number of tests must be an integer between 1 and ${maxTests || 30}.`);
  }
  if (timeout !== undefined) {
    const t = Number(timeout);
    if (!Number.isInteger(t) || t < 500 || t > 10000) {
      errors.push('Timeout must be an integer between 500 and 10000 ms.');
    }
  }
  return errors;
}

module.exports = { isValidDomain, isValidIp, validateTestBody };
