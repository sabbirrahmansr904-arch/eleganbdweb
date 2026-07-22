async function test() {
  console.log("Simulating website order to /api/send-order-email...");
  const orderDetails = {
    id: "ORD-999999",
    customerName: "Mohammad Sabbir",
    phone: "01619835133",
    address: "Mirpur 1, Dhaka",
    paymentMethod: "cod",
    total: 1079,
    deliveryCharge: 80,
    email: "sabbirrahmansr904@gmail.com",
    items: [
      {
        name: "Man's Formal Pant - Black",
        selectedSize: "30",
        price: 999,
        quantity: 1
      }
    ]
  };

  const response = await fetch('http://localhost:3000/api/send-order-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderDetails })
  });

  const text = await response.text();
  console.log("Response status:", response.status);
  console.log("Response text:", text);
}

test().catch(console.error);
