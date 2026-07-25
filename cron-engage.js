const http = require('http');
setInterval(() => {
  http.get('http://localhost:3000/api/cron/auto-engage', (res) => {
    console.log('Engagement processed');
  }).on('error', (e) => console.error(e.message));
}, 60000); // every 60 seconds
