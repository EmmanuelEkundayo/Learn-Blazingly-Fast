import Fuse from 'fuse.js';
import { useConceptStore } from '../store/conceptStore.js';
import { useProjectStore } from '../store/projectStore.js';
import cheatsheets from '../data/cheatsheets/index.js';

let conceptFuseInstance = null;
let projectFuseInstance = null;
let cheatsheetFuseInstance = null;

const cheatsheetItems = cheatsheets.flatMap(sheet =>
  sheet.sections.flatMap(sec =>
    sec.items.map(item => ({
      sheetId: sheet.id,
      sheetTitle: sheet.title,
      sectionTitle: sec.title,
      label: item.label,
      code: item.code,
      note: item.note || '',
    }))
  )
);

export function searchConcepts(query) {
  const concepts = useConceptStore.getState().concepts;
  if (!concepts || concepts.length === 0) return [];
  
  if (!conceptFuseInstance || conceptFuseInstance.list !== concepts) {
    conceptFuseInstance = new Fuse(concepts, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'tags', weight: 0.3 },
        { name: 'card.intuition', weight: 0.2 },
        { name: 'category', weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }

  if (!query.trim()) return concepts;
  return conceptFuseInstance.search(query).map(r => r.item);
}

export function searchProjects(query) {
  const projects = useProjectStore.getState().projects;
  if (!projects || projects.length === 0) return [];

  if (!projectFuseInstance || projectFuseInstance.list !== projects) {
    projectFuseInstance = new Fuse(projects, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'tags', weight: 0.3 },
        { name: 'overview.what', weight: 0.2 },
        { name: 'stack', weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }

  if (!query.trim()) return projects;
  return projectFuseInstance.search(query).map(r => r.item);
}

export function searchCheatsheets(query) {
  if (!cheatsheetFuseInstance) {
    cheatsheetFuseInstance = new Fuse(cheatsheetItems, {
      keys: [
        { name: 'label', weight: 0.4 },
        { name: 'sheetTitle', weight: 0.2 },
        { name: 'sectionTitle', weight: 0.2 },
        { name: 'code', weight: 0.15 },
        { name: 'note', weight: 0.05 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }

  if (!query.trim()) return [];
  return cheatsheetFuseInstance.search(query).map(r => r.item);
}

export function searchAll(query) {
  if (!query.trim()) return { concepts: [], projects: [], cheatsheets: [] };

  return {
    concepts: searchConcepts(query).slice(0, 8),
    projects: searchProjects(query).slice(0, 4),
    cheatsheets: searchCheatsheets(query).slice(0, 5),
  };
}

export function highlightMatches(text, query) {
  if (!query.trim() || !text) return [{ text, highlight: false }]
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map(part => ({
    text: part,
    highlight: part.toLowerCase() === query.toLowerCase()
  }))
}

export function searchAllFiltered(query, filters = {}) {
  const results = searchAll(query)

  if (filters.types?.length) {
    if (!filters.types.includes('concept')) results.concepts = []
    if (!filters.types.includes('project')) results.projects = []
    if (!filters.types.includes('cheatsheet')) results.cheatsheets = []
  }

  return results
}
