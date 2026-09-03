// Vercel Serverless Function for Tracking Order (Pathao / Steadfast)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { consignmentId, trackingCode, trackingId, courier, pathaoCredentials, steadfastCredentials } = req.body || {};
  const identifier = String(consignmentId || trackingCode || trackingId || '').trim();

  if (!identifier) {
    return res.status(400).json({ success: false, error: "Consignment ID / Tracking Code is missing" });
  }

  const preferredCourier = (courier || '').toLowerCase();

  // Try Steadfast if specified or if code looks like Steadfast (#...)
  if (preferredCourier.includes('steadfast') || identifier.startsWith('SF')) {
    try {
      const result = await trackSteadfast(identifier, steadfastCredentials);
      return res.status(200).json(result);
    } catch (sfErr) {
      // Fallback to Pathao
      try {
        const pathaoResult = await trackPathao(identifier, pathaoCredentials);
        return res.status(200).json(pathaoResult);
      } catch (pErr) {
        return res.status(400).json({ success: false, error: sfErr.message || "Failed to track parcel" });
      }
    }
  }

  // Otherwise try Pathao first
  try {
    const pathaoResult = await trackPathao(identifier, pathaoCredentials);
    return res.status(200).json(pathaoResult);
  } catch (pathaoErr) {
    // Fallback to Steadfast
    try {
      const sfResult = await trackSteadfast(identifier, steadfastCredentials);
      return res.status(200).json(sfResult);
    } catch (sfErr) {
      return res.status(400).json({ success: false, error: pathaoErr.message || "Failed to track parcel" });
    }
  }
}

async function trackPathao(rawId, customCreds) {
  const cleanId = String(rawId || '').replace(/^#/, '').trim();
  const creds = customCreds || {
    clientId: 'nXe0A73axr',
    clientSecret: '0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc',
    username: 'eleganbd.ltd@gmail.com',
    password: 'Eleganbdltd22@@##',
    baseUrl: 'https://api-hermes.pathao.com'
  };

  const apiBase = (creds.baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');

  const tokenRes = await fetch(`${apiBase}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: String(creds.clientId).trim(),
      client_secret: String(creds.clientSecret).trim(),
      username: String(creds.username).trim(),
      password: String(creds.password).trim(),
      grant_type: 'password'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error("Pathao Authentication Failed");
  }

  const token = tokenData.access_token;
  const endpoints = [
    `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}/info`,
    `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}/track`,
    `${apiBase}/aladdin/api/v1/orders/${encodeURIComponent(cleanId)}`
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data) {
        let info = data.data || data;
        if (Array.isArray(info)) info = info[0] || {};
        const statusStr = info.order_status || info.delivery_status || info.status || data.order_status;
        if (statusStr) {
          return {
            success: true,
            status: statusStr,
            consignment_id: cleanId,
            delivery_fee: Number(info.delivery_fee || 0),
            amount_to_collect: Number(info.amount_to_collect || 0),
            courier: 'Pathao',
            data: info
          };
        }
      }
    } catch (e) {}
  }

  throw new Error("Parcel status not found in Pathao");
}

async function trackSteadfast(rawId, customCreds) {
  const cleanId = String(rawId || '').replace(/^#/, '').trim();
  const apiKey = customCreds?.apiKey;
  const secretKey = customCreds?.secretKey;

  if (!apiKey || !secretKey) {
    throw new Error("Steadfast credentials not configured");
  }

  const urls = [
    `https://cpanel.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(cleanId)}`,
    `https://cpanel.steadfast.com.bd/api/v1/status_by_cid/${encodeURIComponent(cleanId)}`,
    `https://cpanel.steadfast.com.bd/api/v1/status_by_invoice/${encodeURIComponent(cleanId)}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && (data.status === 200 || data.delivery_status || data.order)) {
        const st = data.delivery_status || data.status || (data.order && data.order.status);
        if (st && st !== 404 && st !== '404') {
          return {
            success: true,
            status: st,
            consignment_id: cleanId,
            tracking_code: cleanId,
            courier: 'Steadfast',
            data
          };
        }
      }
    } catch (e) {}
  }

  throw new Error("Parcel status not found in Steadfast");
}
