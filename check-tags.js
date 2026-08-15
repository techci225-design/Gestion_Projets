const fs = require('fs');
const content = fs.readFileSync('app/(dashboard)/projects/[id]/parametres/parametres-client.tsx', 'utf8');

const tags = content.match(/<\/?([a-zA-Z0-9]+)[^>]*>/g) || [];
const stack = [];

for (let i = 0; i < tags.length; i++) {
  const tagStr = tags[i];
  if (tagStr.endsWith('/>')) continue; // self-closing
  if (tagStr.startsWith('</')) {
    const tagName = tagStr.match(/<\/([a-zA-Z0-9]+)/)[1];
    const top = stack.pop();
    if (top.tagName !== tagName) {
      console.log(`Mismatch at index ${i}: expected </${top.tagName}> but got </${tagName}>. Tag was: ${tagStr}`);
      console.log(`Top was opened at line ${content.substring(0, top.index).split('\\n').length} with ${top.tagStr}`);
      break;
    }
  } else {
    const tagName = tagStr.match(/<([a-zA-Z0-9]+)/);
    if (tagName) {
      const name = tagName[1];
      // Ignore components which might be self closed without /> if not true in TSX but wait, in TSX everything must be explicitly closed.
      // Wait, <input> is self closing sometimes?
      if (!['input', 'img', 'br', 'hr', 'meta', 'link'].includes(name.toLowerCase())) {
        stack.push({ tagName: name, index: content.indexOf(tagStr, i === 0 ? 0 : stack.length), tagStr: tagStr });
      }
    }
  }
}

if (stack.length > 0) {
  console.log('Unclosed tags remaining:', stack.map(s => s.tagName));
} else {
  console.log('All tags balanced!');
}
