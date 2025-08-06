// Temporary fix script to handle the body stream error
const fs = require('fs');

// Read the file
const filePath = './src/components/WorkflowCreationWizard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the double body read issue
const oldCode = `      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${await response.text()}\`);
      }

      const data = await response.json();`;

const newCode = `      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${data.error || 'Request failed'}\`);
      }`;

// Apply the fix
content = content.replace(oldCode, newCode);

// Write back the file
fs.writeFileSync(filePath, content);

console.log('Fixed WorkflowCreationWizard.tsx - body stream error resolved');
