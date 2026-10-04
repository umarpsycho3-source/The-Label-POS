const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<a href="#"><i class="fa-solid fa-hand-holding-dollar"><\/i><br>Balance<\/a>/g, '<a href="/balance.html"><i class="fa-solid fa-hand-holding-dollar"></i><br>Balance</a>');
    fs.writeFileSync(f, content);
});
