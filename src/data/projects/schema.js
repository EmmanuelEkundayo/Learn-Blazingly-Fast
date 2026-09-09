/**
 * Project JSON Schema Reference
 * Path: src/data/projects/*.json
 */
export const ProjectSchema = {
  "id": "string",
  "slug": "string",
  "title": "string",
  "category": "Frontend | Backend | AI | Full-stack | Web Scraping | Distributed Systems",
  "difficulty": "beginner | intermediate | advanced",
  "stack": ["string"],
  "estimated_time": "string (e.g., '45 mins')",
  "overview": {
    "what": "string (one paragraph)",
    "how_it_works": "string (one paragraph)",
    "what_you_learn": ["string"]
  },
  "files": [
    {
      "filename": "string",
      "language": "string",
      "description": "string (one line)",
      "code": "string (full file contents)"
    }
  ],
  "concepts_used": ["string (concept slugs)"],
  "tags": ["string"]
}
