// Vercel Serverless Function for Steadfast Order Creation
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
    const { order, credentials } = req.body || {};

    if (!order) {
      return res.status(400).json({ success: false, error: "Order details are missing" });
    }

    const creds = credentials;
    if (!creds || !creds.apiKey || !creds.secretKey) {
      return res.status(400).json({ success: false, error: "Steadfast API credentials missing" });
    }

    const apiKey = String(creds.apiKey).trim();
    const secretKey = String(creds.secretKey).trim();

    let phone = (order.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('880')) phone = phone.slice(2);
    if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

    let address = `${order.address || ''}${order.thana ? `, ${order.thana}` : ''}${order.city ? `, ${order.city}` : ''}`.trim();
    if (address.length < 10) {
      address = (address + ', Bangladesh').trim();
    }

    const invoice = order.invoiceNo ? String(order.invoiceNo) : String(order.id || '').replace(/^ORD-?/i, '');
    const codAmount = (order.paymentMethod === 'COD' || order.paymentStatus !== 'Paid') ? Number(order.total || 0) : 0;

    const payload = {
      invoice: invoice,
      recipient_name: order.customerName || 'Customer',
      recipient_phone: phone,
      recipient_address: address,
      cod_amount: codAmount,
      note: order.orderNote || 'Handle with care'
    };

    const sfRes = await fetch('https://cpanel.steadfast.com.bd/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await sfRes.json();
    if (sfRes.ok && data.status === 200 && data.consignment) {
      return res.status(200).json({
        success: true,
        consignmentId: data.consignment.consignment_id,
        trackingCode: data.consignment.tracking_code,
        data: data.consignment
      });
    } else {
      const errMsg = data.message || (data.errors ? JSON.stringify(data.errors) : "Failed to create order in Steadfast");
      return res.status(400).json({ success: false, error: errMsg });
    }
  } catch (error) {
    console.error("Vercel Serverless Steadfast error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to communicate with Steadfast API" });
  }
}
