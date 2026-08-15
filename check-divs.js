const fs = require('fs');
const content = fs.readFileSync('app/(dashboard)/projects/[id]/parametres/parametres-client.tsx', 'utf8');

const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;

console.log('Open divs:', divOpen);
console.log('Close divs:', divClose);
