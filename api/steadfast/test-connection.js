// Vercel Serverless Function for Steadfast Test Connection
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
    const { apiKey, secretKey } = req.body || {};
    if (!apiKey || !secretKey) {
      return res.status(400).json({ success: false, error: "Missing required Steadfast API keys" });
    }

    const response = await fetch('https://cpanel.steadfast.com.bd/api/v1/get_balance', {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (response.ok && data.status === 200) {
      return res.status(200).json({ success: true, balance: data.current_balance });
    } else {
      const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : "Steadfast Authentication Failed");
      return res.status(400).json({ success: false, error: errorMsg });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Failed to connect to Steadfast API server" });
  }
}
