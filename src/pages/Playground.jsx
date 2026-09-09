import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProgressStore } from '../store/progressStore.js';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/ui/SEO.jsx';
import { getPageMeta } from '../utils/seo';
import { 
  Play, 
  Terminal as TerminalIcon, 
  Layout, 
  Code2, 
  ListTree, 
  Columns, 
  Trophy, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Trash2, 
  RotateCcw, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Search,
  Check,
  WrapText,
  Type
} from 'lucide-react';
import { runPython, getPyodideStatus, subscribePyodideStatus } from '../utils/pyodide.js';
import { runSandboxedJS } from '../utils/sandbox.js';
import { monacoBeforeMount, EDITOR_OPTIONS } from '../utils/monacoConfig.js';
import { playgroundTemplates } from '../data/playgroundTemplates';
import { playgroundChallenges } from '../data/playgroundChallenges';
import toast from 'react-hot-toast';

// --- Constants & Config ---
const MODES = [
  { id: 'free', name: 'Free', icon: Code2 },
  { id: 'templates', name: 'Templates', icon: ListTree },
  { id: 'challenge', name: 'Challenge', icon: Trophy },
  { id: 'compare', name: 'Compare', icon: Columns },
];

const LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
];

const FONT_SIZES = [12, 14, 16, 18];

const DEFAULT_TEMPLATES = {
  python: 'print("Hello, Learn Blazingly Fast World!")',
  javascript: 'console.log("Hello, Learn Blazingly Fast World!");',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}'
};

// --- Sub-Components ---

const Terminal = ({ output, onClear, height, setHeight }) => {
  const isResizing = useRef(false);

  const startResizing = useCallback((e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.7) {
      setHeight(newHeight);
    }
  }, [setHeight]);

  return (
    <div className="border-t border-surface-700 bg-black flex flex-col" style={{ height }}>
      <div 
        className="h-1 w-full bg-surface-800 hover:bg-blue-500 cursor-ns-resize transition-colors"
        onMouseDown={startResizing}
      />
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-surface-800">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <TerminalIcon size={14} />
          <span>TERMINAL</span>
        </div>
        <button 
          onClick={onClear}
          className="p-1 hover:bg-surface-800 rounded transition-colors text-gray-500 hover:text-white"
          title="Clear (Ctrl+L)"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed custom-scrollbar">
        {output.length === 0 ? (
          <span className="text-gray-600">Output will appear here...</span>
        ) : (
          output.map((line, i) => (
            <div key={i} className={line.type === 'error' ? 'text-red-400' : 'text-green-400'}>
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function Playground() {
  // --- Persistent State ---
  const [mode, setMode] = useState(() => localStorage.getItem('pg_mode') || 'free');
  const [language, setLanguage] = useState(() => localStorage.getItem('pg_lang') || 'python');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('pg_fontSize')) || 14);
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem('pg_wrap') === 'on');
  
  // --- UI State ---
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem(`pg_code_${language}`);
    return saved || DEFAULT_TEMPLATES[language];
  });
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pyStatus, setPyStatus] = useState(getPyodideStatus());
  const [isExecuting, setIsExecuting] = useState(false);
  const [execTime, setExecTime] = useState(null);

  // Challenge State
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Compare State
  const [codeB, setCodeB] = useState('');
  const [terminalOutputB, setTerminalOutputB] = useState([]);
  const [comparison, setComparison] = useState(null);

  const editorRef = useRef(null);
  const editorRefB = useRef(null);
  const hasTrackedRunRef = useRef(false);
  const incrementInteractions = useProgressStore(s => s.incrementInteractions);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('pg_mode', mode);
    localStorage.setItem('pg_lang', language);
    localStorage.setItem('pg_fontSize', fontSize);
    localStorage.setItem('pg_wrap', wordWrap ? 'on' : 'off');
    if (mode === 'free') {
      localStorage.setItem(`pg_code_${language}`, code);
    }
  }, [mode, language, fontSize, wordWrap, code]);

  useEffect(() => subscribePyodideStatus(setPyStatus), []);

  // --- Handlers ---
  const handleLanguageChange = (id) => {
    setLanguage(id);
    const saved = localStorage.getItem(`pg_code_${id}`);
    const newCode = saved || DEFAULT_TEMPLATES[id];
    setCode(newCode);
    setTerminalOutput([]);
    setExecTime(null);
    if (mode === 'challenge') {
      setCurrentChallenge(playgroundChallenges[id]?.[0] || null);
      setTestResults(null);
    }
  };

  const clearOutput = () => {
    setTerminalOutput([]);
    setTerminalOutputB([]);
    setExecTime(null);
    setComparison(null);
  };

  const runCode = async (targetCode = code, isCompareB = false) => {
    const log = (content, type = 'output') => {
      const entry = { content, type, timestamp: Date.now() };
      if (isCompareB) {
        setTerminalOutputB(prev => [...prev, entry]);
      } else {
        setTerminalOutput(prev => [...prev, entry]);
      }
    };

    if (language === 'java' || language === 'cpp') {
      toast.error('Local execution only for Java/C++');
      return;
    }

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      if (language === 'python') {
        if (pyStatus === 'idle') {
          log('Loading Python runtime...', 'output');
        }
        const result = await runPython(targetCode);
        if (result.error) log(result.error, 'error');
        if (result.stderr) log(result.stderr, 'error');
        if (result.stdout) log(result.stdout, 'output');
      } else if (language === 'javascript') {
        const lines = await runSandboxedJS(targetCode);
        lines.forEach(c => log(c.text, c.kind));
      }
    } catch (err) {
      log(err.message, 'error');
    } finally {
      const endTime = performance.now();
      setExecTime(Math.round(endTime - startTime));
      setIsExecuting(false);
      if (!hasTrackedRunRef.current) {
        hasTrackedRunRef.current = true;
        incrementInteractions();
      }
    }
  };

  const runChallenge = async () => {
    if (!currentChallenge) return;
    if (language === 'java' || language === 'cpp') return;

    setIsExecuting(true);
    const results = [];
    
    for (const test of currentChallenge.test_cases) {
      const wrapped = currentChallenge.test_runner_code(code, test);
      let passed = false;
      let actual = '';

      if (language === 'python') {
        const res = await runPython(wrapped);
        try {
          actual = JSON.parse(res.stdout.trim());
          passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        } catch {
          actual = res.stdout || res.error;
          passed = false;
        }
      } else if (language === 'javascript') {
        const lines = await runSandboxedJS(wrapped);
        const last = [...lines].reverse().find(l => l.kind === 'output');
        try {
          actual = JSON.parse(last ? last.text : '');
          passed = JSON.stringify(actual) === JSON.stringify(test.expected);
        } catch {
          actual = last ? last.text : 'no output';
          passed = false;
        }
      }
      results.push({ ...test, actual, passed });
    }

    setTestResults(results);
    setIsExecuting(false);
  };

  const handleRunBoth = async () => {
    clearOutput();
    await Promise.all([runCode(code), runCode(codeB, true)]);
    
    // Simplistic comparison
    setComparison({
      match: terminalOutput.map(l => l.content).join('') === terminalOutputB.map(l => l.content).join(''),
      linesA: code.split('\n').length,
      linesB: codeB.split('\n').length
    });
  };

  // --- Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'challenge') runChallenge();
        else if (mode === 'compare') handleRunBoth();
        else runCode();
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        clearOutput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, code, codeB, language]);

  return (
    <div className="flex flex-col bg-surface-950 text-white h-[calc(100vh-64px)] overflow-hidden">
      <SEO {...getPageMeta('/playground')} />
      {/* --- Toolbar --- */}
      <div className="h-14 border-b border-surface-800 bg-surface-900/50 backdrop-blur flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex bg-black/40 p-1 rounded-lg border border-surface-800">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setExecTime(null); setTerminalOutput([]); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-white'
                }`}
              >
                <m.icon size={16} />
                <span className="hidden sm:inline">{m.name}</span>
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-surface-700 hidden md:block" />

          <div className="flex bg-black/40 p-1 rounded-lg border border-surface-800 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => handleLanguageChange(l.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  language === l.id ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Type size={14} />
              <select 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-surface-800 text-xs border-none rounded py-1 pl-2 pr-6 outline-none"
              >
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
            </div>
            <button 
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-1.5 rounded transition-colors ${wordWrap ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white'}`}
              title="Toggle Wrap"
            >
              <WrapText size={18} />
            </button>
          </div>

          <button 
            onClick={() => { setCode(DEFAULT_TEMPLATES[language]); clearOutput(); }}
            className="p-1.5 text-gray-500 hover:text-white transition-colors"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>

          {mode === 'compare' ? (
            <button 
              onClick={handleRunBoth}
              disabled={isExecuting || language === 'java' || language === 'cpp'}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              RUN BOTH
            </button>
          ) : mode !== 'challenge' && (
            <button 
              onClick={() => runCode()}
              disabled={isExecuting || language === 'java' || language === 'cpp'}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg disabled:opacity-50 ${
                language === 'java' || language === 'cpp' 
                ? 'bg-surface-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {isExecuting ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              {language === 'java' || language === 'cpp' ? 'COPY ONLY' : 'RUN'}
            </button>
          )}
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Templates Sidebar */}
        <AnimatePresence>
          {showTemplates && mode === 'templates' && (
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="absolute inset-y-0 left-0 w-72 bg-surface-900 border-r border-surface-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-surface-800 flex items-center justify-between bg-black/20">
                <span className="font-semibold text-sm">Algorithm Templates</span>
                <button onClick={() => setShowTemplates(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-4 no-scrollbar">
                {['dsa', 'ml', 'patterns'].map(cat => {
                  const items = playgroundTemplates[language]?.[cat] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">{cat}</div>
                      <div className="space-y-1">
                        {items.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setCode(t.code); setShowTemplates(false); clearOutput(); }}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-800 text-sm group flex items-center justify-between transition-colors"
                          >
                            <span className="text-gray-300 group-hover:text-white font-medium">{t.name}</span>
                            <ChevronRight size={14} className="text-gray-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0f]">
          {mode === 'templates' && !showTemplates && (
            <button 
              onClick={() => setShowTemplates(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-600 p-1.5 rounded-r-lg shadow-lg z-40 hover:pl-3 transition-all group"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          )}

          <div className="flex-1 flex overflow-hidden">
            {mode === 'challenge' && (
              <div className="w-[40%] border-r border-surface-800 flex flex-col bg-surface-900/30 overflow-hidden">
                <div className="p-4 border-b border-surface-800 bg-surface-900 flex items-center gap-3">
                  <select 
                    className="flex-1 bg-black/40 border-surface-700 text-sm p-1.5 rounded outline-none"
                    onChange={(e) => {
                      const c = playgroundChallenges[language].find(x => x.id === e.target.value);
                      setCurrentChallenge(c);
                      setCode(c?.starter_code || '');
                      setTestResults(null);
                    }}
                  >
                    {playgroundChallenges[language]?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    currentChallenge?.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {currentChallenge?.difficulty}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar text-gray-300">
                  <h2 className="text-2xl font-bold text-white">{currentChallenge?.title}</h2>
                  <p className="leading-relaxed whitespace-pre-wrap">{currentChallenge?.description}</p>
                  
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Example</h3>
                    {currentChallenge?.examples.map((ex, i) => (
                      <div key={i} className="bg-black/40 p-4 rounded-lg border border-surface-800 text-sm space-y-2">
                        <div className="flex gap-2"><span className="text-blue-400 font-bold shrink-0">Input:</span> <code>{ex.input}</code></div>
                        <div className="flex gap-2"><span className="text-green-400 font-bold shrink-0">Output:</span> <code>{ex.output}</code></div>
                        {ex.explanation && <p className="text-gray-500 italic mt-2">{ex.explanation}</p>}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Constraints</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                      {currentChallenge?.constraints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col relative">
              {language === 'java' || language === 'cpp' ? (
                <div className="flex-1 flex flex-col">
                  <div className="bg-amber-900/20 border-b border-amber-500/30 p-2 text-center flex items-center justify-center gap-2">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-xs text-amber-200">Execution not available for {language === 'java' ? 'Java' : 'C++'} in browser. Run locally.</span>
                  </div>
                  <Editor
                    height="100%"
                    language={language}
                    theme="lbf-dark"
                    value={code}
                    onChange={setCode}
                    onBeforeMount={monacoBeforeMount}
                    options={{ ...EDITOR_OPTIONS, fontSize, wordWrap: wordWrap ? 'on' : 'off' }}
                  />
                  <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                    <button 
                      onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied to clipboard'); }}
                      className="group flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl"
                    >
                      <Copy size={18} />
                      COPY CODE
                    </button>
                  </div>
                </div>
              ) : mode === 'compare' ? (
                <div className="flex-1 flex gap-px bg-surface-800">
                  <div className="flex-1 flex flex-col bg-[#0d0d0f]">
                    <div className="h-8 flex items-center px-4 bg-surface-900 text-[10px] font-bold text-gray-500 tracking-widest border-b border-surface-800">EDITOR A</div>
                    <Editor
                      height="100%"
                      language={language}
                      theme="lbf-dark"
                      value={code}
                      onChange={setCode}
                      onBeforeMount={monacoBeforeMount}
                      options={{ ...EDITOR_OPTIONS, fontSize, wordWrap: wordWrap ? 'on' : 'off' }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col bg-[#0d0d0f]">
                    <div className="h-8 flex items-center px-4 bg-surface-900 text-[10px] font-bold text-gray-500 tracking-widest border-b border-surface-800">EDITOR B</div>
                    <Editor
                      height="100%"
                      language={language}
                      theme="lbf-dark"
                      value={codeB}
                      onChange={setCodeB}
                      onBeforeMount={monacoBeforeMount}
                      options={{ ...EDITOR_OPTIONS, fontSize, wordWrap: wordWrap ? 'on' : 'off' }}
                    />
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={language}
                  theme="lbf-dark"
                  value={code}
                  onChange={setCode}
                  onBeforeMount={monacoBeforeMount}
                  options={{ ...EDITOR_OPTIONS, fontSize, wordWrap: wordWrap ? 'on' : 'off' }}
                />
              )}
            </div>
          </div>

          {/* Bottom Panel */}
          {mode === 'challenge' ? (
            <div className="h-64 border-t border-surface-800 bg-black flex flex-col shrink-0">
               <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-surface-800">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <CheckCircle size={14} />
                  <span>TEST RESULTS</span>
                </div>
                <button 
                  onClick={runChallenge}
                  disabled={isExecuting}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isExecuting ? <RotateCcw size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                  RUN TESTS
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {testResults ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold">
                        {testResults.filter(r => r.passed).length} / {testResults.length} Tests Passed
                      </div>
                      <div className="h-2 flex-1 max-w-xs bg-surface-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${(testResults.filter(r => r.passed).length / testResults.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {testResults.map((res, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${res.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <div className="flex items-center gap-3">
                            {res.passed ? <CheckCircle size={16} className="text-green-500"/> : <AlertCircle size={16} className="text-red-500"/>}
                            <span className="font-semibold">Test Case {i + 1}</span>
                          </div>
                          {!res.passed && (
                            <div className="mt-2 pl-7 text-xs space-y-1 font-mono">
                              <div className="text-gray-500">Expected: <span className="text-green-400">{JSON.stringify(res.expected)}</span></div>
                              <div className="text-gray-500">Actual: <span className="text-red-400">{JSON.stringify(res.actual)}</span></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <Trophy size={32} className="opacity-20" />
                    <p>Click "Run Tests" to check your solution</p>
                  </div>
                )}
              </div>
            </div>
          ) : mode === 'compare' ? (
            <div className="flex flex-col border-t border-surface-800 bg-black shrink-0" style={{ height: terminalHeight }}>
              <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-surface-800 h-10">
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Comparison Panel</span>
                  {comparison && (
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {comparison.match ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}
                        <span className={comparison.match ? 'text-green-500' : 'text-red-500'}>
                          Outputs {comparison.match ? 'match' : 'differ'}
                        </span>
                      </div>
                      <div className="text-gray-400">Lines: {comparison.linesA} vs {comparison.linesB}</div>
                    </div>
                  )}
                </div>
                <button onClick={clearOutput} className="text-gray-500 hover:text-white"><Trash2 size={14}/></button>
              </div>
              <div className="flex-1 flex divide-x divide-surface-800">
                <div className="flex-1 overflow-auto p-4 font-mono text-sm custom-scrollbar">
                  {terminalOutput.map((l, i) => <div key={i} className={l.type === 'error' ? 'text-red-400' : 'text-green-400'}>{l.content}</div>)}
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm custom-scrollbar">
                  {terminalOutputB.map((l, i) => <div key={i} className={l.type === 'error' ? 'text-red-400' : 'text-green-400'}>{l.content}</div>)}
                </div>
              </div>
            </div>
          ) : (
            <Terminal 
              output={terminalOutput} 
              onClear={clearOutput} 
              height={terminalHeight} 
              setHeight={setTerminalHeight} 
            />
          )}

          {/* Quick Stats Overlay (Free mode) */}
          {mode === 'free' && execTime !== null && (
            <div className="absolute right-6 bottom- terminalHeight ? terminalHeight + 16 : 16 z-10">
              <div className="bg-black/60 backdrop-blur border border-surface-700 rounded-full px-3 py-1 flex items-center gap-2 shadow-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-gray-300">Execution time: <span className="text-white font-bold">{execTime}ms</span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
