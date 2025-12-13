const fs = require('fs');
const content = `node_modules/
android/
ios/
.expo/
dist/
web-build/
.git/
*.zip
*.tar.gz
`;

try {
  fs.writeFileSync('.easignore', content, 'utf8');
  console.log('✅ .easignore has been FIXED with correct encoding.');
} catch (e) {
  console.error('Error fixing file:', e);
}