const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();
doc.setFontSize(16);
doc.text('Research Notes on Team Performance', 20, 20);
doc.setFontSize(12);
doc.text('Abstract:', 20, 35);
doc.setFontSize(10);
const abstractText = 'This paper explores the relationship between team diversity and performance outcomes in startup organizations. We find that diverse teams show differential performance based on task type.';
const splitAbstract = doc.splitTextToSize(abstractText, 170);
doc.text(splitAbstract, 20, 45);

doc.text('Key Findings:', 20, 75);
doc.text('1. Diverse teams outperform in creative tasks', 25, 85);
doc.text('2. Homogeneous teams excel in execution tasks', 25, 95);
doc.text('3. Task complexity moderates this relationship', 25, 105);

doc.text('Theoretical Implications:', 20, 125);
const implText = 'These findings challenge the assumption that diversity uniformly benefits team performance. Instead, we propose a contingency model where task characteristics determine optimal team composition.';
const splitImpl = doc.splitTextToSize(implText, 170);
doc.text(splitImpl, 20, 135);

const pdfBuffer = doc.output('arraybuffer');
fs.writeFileSync(__dirname + '/research_notes.pdf', Buffer.from(pdfBuffer));
console.log('PDF file created successfully');
