/**
 * Sandboxed JavaScript runner.
 *
 * User-authored code runs inside a `<iframe sandbox="allow-scripts">` with a
 * `blob:` (or `srcdoc`) origin, isolated from the app's DOM, cookies,
 * localStorage, and network.  Only `postMessage` crosses the boundary so the
 * page can capture output safely.
 *
 * The frame is destroyed and recreated on each run to prevent state leakage
 * between executions (and to hard-kill infinite loops).
 */

const TIMEOUT_MS = 5000;

let iframe = null;

function destroyFrame() {
  if (iframe) {
    iframe.remove();
    iframe = null;
  }
}

function createFrame() {
  destroyFrame();
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-9999px';
  frame.style.top = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.setAttribute('tabindex', '-1');
  document.body.appendChild(frame);
  iframe = frame;
  return frame;
}

function buildHtml(code) {
  const src = String(code);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
</head>
<body>
<script>
(function () {
  var pendingError = null;
  var finished = false;

  function post(type, payload) {
    if (parent.postMessage) parent.postMessage({ type: type, payload: payload }, '*');
  }

  var captured = [];
  function emit(kind) {
    return function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        if (typeof a === 'object' && a !== null) {
          try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
        }
        return String(a);
      });
      captured.push({ text: args.join(' '), kind: kind });
    };
  }

  var origLog = console.log, origWarn = console.warn, origError = console.error;
  console.log = emit('output');
  console.warn = emit('output');
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    emit('error').apply(null, args);
    pendingError = args.map(String).join(' ');
  };

  setTimeout(function () {
    try {
      var runner = new Function(${JSON.stringify(src)});
      var evalRes = runner();
      if (evalRes !== undefined && captured.length === 0) {
        post('log', { text: (typeof evalRes === 'object' && evalRes !== null
          ? JSON.stringify(evalRes, null, 2) : String(evalRes)), kind: 'output' });
      }
    } catch (err) {
      post('log', { text: err && err.message ? err.message : String(err), kind: 'error' });
      finished = true;
      return;
    }

    captured.forEach(function (c) { post('log', { text: c.text, kind: c.kind }); });
    if (pendingError) post('uncaught', pendingError);
    finished = true;
  }, 0);
</script>
</body>
</html>`;
}

/**
 * Execute `code` in a fresh sandboxed iframe.
 * Returns Promise<Array<{ text: string, kind: 'output'|'error' }>>.
 */
export function runSandboxedJS(code) {
  return new Promise((resolve) => {
    const frame = createFrame();
    const logs = [];

    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      destroyFrame();
      resolve(logs);
    };

    const onMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'log') {
        logs.push({ text: String(e.data.payload && e.data.payload.text), kind: e.data.payload && e.data.payload.kind });
      }
    };

    window.addEventListener('message', onMessage);

    const timer = setTimeout(() => {
      const error = { text: `Execution timed out (${TIMEOUT_MS / 1000} second limit)`, kind: 'error' };
      logs.push(error);
      finish();
    }, TIMEOUT_MS);

    frame.srcdoc = buildHtml(code);

    const poll = () => {
      if (settled) return;
      if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
        clearTimeout(timer);
        finish();
      } else {
        setTimeout(poll, 120);
      }
    };
    setTimeout(poll, 150);
  });
}