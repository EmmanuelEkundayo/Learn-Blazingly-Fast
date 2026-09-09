import fs from 'fs';
import path from 'path';

const conceptsDir = path.resolve('src/data/concepts');
const files = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.json'));

const concepts = {};
files.forEach(file => {
  const content = JSON.parse(fs.readFileSync(path.join(conceptsDir, file), 'utf-8'));
  concepts[content.slug] = content;
});

let errors = 0;
let conceptsWithPrereqs = 0;

files.forEach(file => {
  const content = JSON.parse(fs.readFileSync(path.join(conceptsDir, file), 'utf-8'));
  const { prerequisites } = content;

  if (!prerequisites) return;
  conceptsWithPrereqs++;

  if (!Array.isArray(prerequisites)) {
    console.error(`Error in ${file}: "prerequisites" should be an array`);
    errors++;
    return;
  }

  prerequisites.forEach((prereqSlug, index) => {
    if (!concepts[prereqSlug]) {
      console.error(`Error in ${file}: prerequisite "${prereqSlug}" (index ${index}) does not reference an existing concept`);
      errors++;
    }
  });
});

console.log(`Validated ${conceptsWithPrereqs} concepts with prerequisites.`);

if (errors === 0) {
  console.log(`${conceptsWithPrereqs} / ${conceptsWithPrereqs} concepts with prerequisites validated successfully.`);
  process.exit(0);
} else {
  console.error(`Found ${errors} broken prerequisite reference(s).`);
  process.exit(1);
}
