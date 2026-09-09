export const LBF_DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7280' },
    { token: 'keyword', foreground: '60a5fa' },
    { token: 'string',  foreground: '86efac' },
    { token: 'number',  foreground: 'fde68a' },
  ],
  colors: {
    'editor.background':              '#0d0d0f',
    'editor.lineHighlightBackground': '#1c1c22',
    'editorLineNumber.foreground':    '#4b5563',
    'editorCursor.foreground':        '#60a5fa',
    'editor.selectionBackground':     '#1d4ed850',
  },
}

export function monacoBeforeMount(monaco) {
  monaco.editor.defineTheme('lbf-dark', LBF_DARK_THEME)
}

export const EDITOR_OPTIONS = {
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 14,
  lineHeight: 22,
  minimap:            { enabled: false },
  scrollBeyondLastLine: false,
  padding:            { top: 14, bottom: 14 },
  wordWrap:           'on',
  renderWhitespace:   'selection',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar:          { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  renderLineHighlight:'gutter',
}
