const fs = require('fs');
const content = fs.readFileSync('app/(dashboard)/projects/[id]/parametres/parametres-client.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('textarea')) {
    console.log(`Line ${i+1}: ${line}`);
  }
});
