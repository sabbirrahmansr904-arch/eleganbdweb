// Vercel Serverless Function for Pathao Order Creation
export default async function handler(req, res) {
  // CORS Headers
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

    const creds = credentials || {
      clientId: 'nXe0A73axr',
      clientSecret: '0LyQiusPk4HguMTc3oZJaXIeKzjXWH7Yq0LsjPKc',
      username: 'eleganbd.ltd@gmail.com',
      password: 'Eleganbdltd22@@##',
      storeId: '376372',
      baseUrl: 'https://api-hermes.pathao.com'
    };

    if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
      return res.status(400).json({ success: false, error: "Pathao API credentials missing" });
    }

    const apiBase = (creds.baseUrl || 'https://api-hermes.pathao.com').replace(/\/$/, '');

    // Step 1: Issue token
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
      const tokenErr = tokenData.message || tokenData.error || (tokenData.errors ? JSON.stringify(tokenData.errors) : "Pathao Authentication Failed");
      return res.status(400).json({ success: false, error: `Pathao Auth Failed: ${tokenErr}` });
    }

    const accessToken = tokenData.access_token;

    // Step 2: Format recipient info
    let phone = (order.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('880')) phone = phone.slice(2);
    if (!phone.startsWith('0') && phone.length === 10) phone = '0' + phone;

    let address = `${order.address || ''}${order.thana ? `, ${order.thana}` : ''}${order.city ? `, ${order.city}` : ''}`.trim();
    if (address.length < 10) {
      address = (address + ', Bangladesh').trim();
    }

    let finalCityId = Number(order.cityId);
    let finalZoneId = Number(order.zoneId);

    // Resolve City ID & Zone ID if not provided
    if (!finalCityId || !finalZoneId || isNaN(finalCityId) || isNaN(finalZoneId)) {
      try {
        const cityRes = await fetch(`${apiBase}/aladdin/api/v1/countries/1/city-list`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        const cData = await cityRes.json();
        const cities = cData?.data?.data || cData?.data || [];

        const targetCityName = (order.city || '').trim().toLowerCase();
        const matchedCity = cities.find(c => 
          c.city_name?.toLowerCase() === targetCityName ||
          c.city_name?.toLowerCase().includes(targetCityName) ||
          targetCityName.includes(c.city_name?.toLowerCase())
        );

        if (matchedCity) {
          finalCityId = matchedCity.city_id;
        } else {
          finalCityId = Number(creds.defaultCityId || 1);
        }

        const zoneRes = await fetch(`${apiBase}/aladdin/api/v1/cities/${finalCityId}/zone-list`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        const zData = await zoneRes.json();
        const zones = zData?.data?.data || zData?.data || [];

        const targetZoneName = (order.thana || order.zone || '').trim().toLowerCase();
        const matchedZone = zones.find(z => 
          z.zone_name?.toLowerCase() === targetZoneName ||
          z.zone_name?.toLowerCase().includes(targetZoneName) ||
          targetZoneName.includes(z.zone_name?.toLowerCase())
        );

        if (matchedZone) {
          finalZoneId = matchedZone.zone_id;
        } else if (zones && zones.length > 0) {
          finalZoneId = zones[0].zone_id;
        } else {
          finalZoneId = Number(creds.defaultZoneId || 1);
        }
      } catch (e) {
        console.warn("Location auto-resolve fallback:", e);
        if (!finalCityId) finalCityId = 1;
        if (!finalZoneId) finalZoneId = 1;
      }
    }

    const itemsDesc = (order.items || []).map(i => `${i.name}${i.selectedSize ? ` (${i.selectedSize})` : ''} x${i.quantity || 1}`).join(', ');
    const totalQty = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

    const payload = {
      store_id: Number(creds.storeId || 376372),
      merchant_order_id: order.invoiceNo ? String(order.invoiceNo) : String(order.id || '').replace(/^ORD-?/i, ''),
      recipient_name: order.customerName || 'Customer',
      recipient_phone: phone,
      recipient_address: address,
      recipient_city: finalCityId || 1,
      recipient_zone: finalZoneId || 1,
      delivery_type: Number(order.delivery_type || 48),
      item_type: 2,
      special_instruction: (order.orderNote !== undefined && order.orderNote !== null) ? order.orderNote : 'Handle with care',
      item_quantity: totalQty || 1,
      item_weight: Number(order.item_weight || 0.5),
      amount_to_collect: (order.paymentMethod === 'COD' || order.paymentStatus !== 'Paid') ? Number(order.total || 0) : 0,
      item_description: itemsDesc || 'Garments / Apparel item'
    };

    if (order.areaId || creds.defaultAreaId) {
      payload.recipient_area = Number(order.areaId || creds.defaultAreaId);
    }

    // Step 3: Call Pathao API
    const orderRes = await fetch(`${apiBase}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const orderData = await orderRes.json();

    if (orderRes.ok && (orderData.data || orderData.consignment_id)) {
      const consignmentId = orderData.data?.consignment_id || orderData.consignment_id;
      return res.status(200).json({
        success: true,
        consignment_id: consignmentId,
        data: orderData.data || orderData
      });
    } else {
      const orderErr = orderData.message || (orderData.errors ? JSON.stringify(orderData.errors) : "Pathao Order Booking Failed");
      return res.status(400).json({ success: false, error: orderErr });
    }
  } catch (error) {
    console.error("Vercel Serverless Pathao Order error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to communicate with Pathao API" });
  }
}
