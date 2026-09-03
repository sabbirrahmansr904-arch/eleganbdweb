// Vercel Serverless Function for Pathao Test Connection
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

  try {
    const { clientId, clientSecret, username, password, baseUrl } = req.body || {};
    if (!clientId || !clientSecret || !username || !password) {
      return res.status(400).json({ success: false, error: "Missing required Pathao credentials" });
    }

    const apiBase = (baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password,
        grant_type: 'password'
      })
    });

    const data = await response.json();
    if (response.ok && data.access_token) {
      return res.status(200).json({ success: true, access_token: data.access_token });
    } else {
      const errorMsg = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : "Pathao Authentication Failed");
      return res.status(400).json({ success: false, error: errorMsg });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to connect to Pathao API server" });
  }
}
