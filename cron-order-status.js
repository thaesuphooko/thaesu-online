const http = require('http');

function updateOrders() {
  http.get('http://localhost:3000/api/cron/update-order-status', (res) => {
    res.on('data', () => {});
    res.on('end', () => console.log('Order statuses updated'));
  }).on('error', (e) => console.error(e.message));
}

// Run every 30 seconds
setInterval(updateOrders, 30000);
updateOrders();
