const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'app/(dashboard)/projects/[id]/risques/page.tsx',
  'app/(dashboard)/projects/[id]/parametres/page.tsx',
  'app/(dashboard)/projects/[id]/ptba/page.tsx',
  'app/(dashboard)/projects/[id]/marches/page.tsx',
  'app/(dashboard)/projects/[id]/logframe/page.tsx'
];

filesToPatch.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the select with inner join
    content = content.replace(/\.select\(['"`]\*, project_members!inner\(role\)['"`]\)/g, ".select('*')");
    
    // Remove the eq line for project_members.user_id
    content = content.replace(/\s*\.eq\(['"`]project_members\.user_id['"`],\s*user\.id\)/g, "");

    // For parametres/page.tsx, we need to handle userRole
    if (file.includes('parametres')) {
      // It currently has userRole={project.project_members[0]?.role}
      // Since project_members is now undefined, let's replace it with a separate query or just 'admin' if Super Admin
      content = content.replace(/userRole=\{project\.project_members\[0\]\?\.role\}/g, "userRole={undefined}");
    }

    fs.writeFileSync(fullPath, content);
    console.log(`Patched ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
