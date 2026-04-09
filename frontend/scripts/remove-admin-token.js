const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'myproject', 'static', 'admin_token.json'),
  path.join(__dirname, '..', 'public', 'admin_token.json'),
  path.join(__dirname, '..', '..', 'project', 'myproject', 'static', 'admin_token.json')
];

for (const t of targets) {
  try {
    if (fs.existsSync(t)) {
      fs.unlinkSync(t);
      console.log('Removed', t);
    }
  } catch (e) {
    // ignore errors
  }
}
