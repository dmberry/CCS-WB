const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

function readAGCFiles(sourceDir) {
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.agc'));
  return files.map(filename => {
    const filepath = path.join(sourceDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const stats = fs.statSync(filepath);
    return {
      name: filename,
      content: content,
      size: stats.size
    };
  });
}

function createCCSProject(name, mode, agcFiles) {
  const projectId = generateUUID();
  const timestamp = new Date().toISOString();

  const codeFiles = agcFiles.map(file => ({
    id: generateUUID(),
    name: file.name,
    language: 'agc',
    source: 'shared',
    size: file.size,
    uploadedAt: timestamp
  }));

  const codeContents = {};
  codeFiles.forEach((fileMetadata, index) => {
    codeContents[fileMetadata.id] = agcFiles[index].content;
  });

  return {
    id: projectId,
    mode: mode,
    messages: [
      {
        id: generateUUID(),
        role: 'assistant',
        content: 'What code would you like to explore? You can paste it directly, upload a file, or describe what you\'re looking at. I\'m curious what drew your attention to this particular piece of software.',
        metadata: {
          phase: 'opening'
        },
        timestamp: timestamp
      }
    ],
    codeFiles: codeFiles,
    codeContents: codeContents,
    lineAnnotations: []
  };
}

// Generate Comanche055 project
const comancheDir = '/Users/hbp17/Library/Mobile Documents/com~apple~CloudDocs/Documents/RESEARCH/WritingLab/knowledge/temp/Apollo-11-code/Comanche055';
const comancheFiles = readAGCFiles(comancheDir);
const comancheProject = createCCSProject('Apollo 11 - Comanche055 (Command Module)', 'critique', comancheFiles);

const comancheOutputPath = '/Users/hbp17/Library/Mobile Documents/com~apple~CloudDocs/Documents/RESEARCH/WritingLab/CCS-WB/public/sample-code/apollo-11-comanche/comanche055.ccs';
fs.writeFileSync(comancheOutputPath, JSON.stringify(comancheProject, null, 2));
console.log(`Created ${comancheOutputPath} with ${comancheFiles.length} files`);

// Generate Luminary099 project
const luminaryDir = '/Users/hbp17/Library/Mobile Documents/com~apple~CloudDocs/Documents/RESEARCH/WritingLab/knowledge/temp/Apollo-11-code/Luminary099';
const luminaryFiles = readAGCFiles(luminaryDir);
const luminaryProject = createCCSProject('Apollo 11 - Luminary099 (Lunar Module)', 'critique', luminaryFiles);

const luminaryOutputPath = '/Users/hbp17/Library/Mobile Documents/com~apple~CloudDocs/Documents/RESEARCH/WritingLab/CCS-WB/public/sample-code/apollo-11-luminary/luminary099.ccs';
fs.writeFileSync(luminaryOutputPath, JSON.stringify(luminaryProject, null, 2));
console.log(`Created ${luminaryOutputPath} with ${luminaryFiles.length} files`);

console.log('\nDone! Apollo 11 sample projects created.');
