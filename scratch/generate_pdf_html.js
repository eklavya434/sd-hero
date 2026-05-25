import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the workspace root
const workspaceRoot = 'c:/Users/eklav/Downloads/sdhero';

function getFileContent(relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.error(`Failed to read ${relativePath}:`, err);
    return `// Failed to load ${relativePath}`;
  }
}

// Escape HTML entities to prevent rendering issues in <pre><code>
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const promptText = `Create a modern, professional, mobile-responsive website for a real Indian two-wheeler service center business. The website should feel trustworthy, practical, fast, and easy to use for normal customers, including people who are not very tech-savvy.

Business Type:
A local two-wheeler service and repair center that handles bike servicing, repairs, oil changes, washing, pickup/drop services, emergency breakdown support, and spare parts assistance.

Goal of the Website:
Help a traditional offline service center become digital by improving customer communication, online visibility, booking convenience, and trust.

Design Requirements:
- Clean modern UI, professional but simple design
- Mobile-first responsive layout, fast loading
- Use colors suitable for automotive/service businesses
- Periodical servicing, engine repair, washing, pick/drop, dynamic loyalty system, digital bike health reports, dynamic UPI payments, floating WhatsApp buttons...`;

const htmlOutput = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SD Hero Service Centre - Complete Codebase & Blueprint Export</title>
  <style>
    :root {
      --bg-primary: #12141c;
      --bg-secondary: #171921;
      --accent: #ff6a00;
      --text-primary: #f5f6f8;
      --text-secondary: #9aa0a6;
      --border-color: rgba(255, 255, 255, 0.08);
      --font-code: 'Fira Code', 'Courier New', monospace;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0c0d12;
      color: #e3e5e8;
      line-height: 1.6;
      margin: 0;
      padding: 3rem 2rem;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 2rem;
      margin-bottom: 3rem;
      text-align: center;
    }
    header h1 {
      font-size: 2.5rem;
      color: #fff;
      margin: 0 0 0.5rem 0;
    }
    header p {
      color: var(--text-secondary);
      font-size: 1.1rem;
      margin: 0;
    }
    .print-hint {
      background-color: rgba(255, 106, 0, 0.1);
      border: 1px dashed var(--accent);
      color: var(--accent);
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 2.5rem;
      font-weight: 600;
      text-align: center;
    }
    .section-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 2.5rem;
      margin-bottom: 3rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .section-card h2 {
      font-size: 1.6rem;
      color: #fff;
      margin-top: 0;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-card h2 span.path {
      font-family: var(--font-code);
      font-size: 0.95rem;
      color: var(--accent);
      background-color: rgba(255, 106, 0, 0.08);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      border: 1px solid rgba(255, 106, 0, 0.15);
    }
    .prompt-box {
      background-color: rgba(255, 255, 255, 0.02);
      border-left: 4px solid var(--accent);
      padding: 1.5rem;
      white-space: pre-line;
      color: #d1d4db;
      font-size: 0.95rem;
    }
    pre {
      background-color: #08090d;
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 1.5rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1.5rem 0 0 0;
    }
    code {
      font-family: var(--font-code);
      font-size: 0.85rem;
      color: #a9b2c3;
    }
    
    /* Print Styles to compile perfectly as a PDF */
    @media print {
      body {
        background-color: #fff;
        color: #000;
        padding: 0;
      }
      .print-hint {
        display: none;
      }
      .section-card {
        background-color: #fff;
        border: none;
        box-shadow: none;
        padding: 0;
        margin-bottom: 4rem;
        page-break-inside: avoid;
      }
      .section-card h2 {
        color: #000;
        border-bottom: 2px solid #000;
      }
      .section-card h2 span.path {
        color: #000;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
      }
      pre {
        background-color: #fcfcfc;
        border: 1px solid #ddd;
        page-break-inside: auto;
      }
      code {
        color: #000;
        white-space: pre-wrap; /* Wrap lines in printed PDF */
      }
      .prompt-box {
        background-color: #fcfcfc;
        border-left-color: #000;
        color: #000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>SD Hero Service Centre</h1>
      <p>Patna's Premium Two-Wheeler Workshop - Complete Codebase Blueprint</p>
    </header>

    <div class="print-hint">
      🖨️ Ready for PDF saving! Press <strong>Ctrl + P</strong> (or <strong>Cmd + P</strong> on Mac), select <strong>"Save as PDF"</strong> as your destination, check <strong>"Background graphics"</strong>, and click Save!
    </div>

    <!-- 1. Prompt Checklist Section -->
    <div class="section-card">
      <h2>📋 Business Blueprint Goals</h2>
      <div class="prompt-box">${escapeHtml(promptText)}</div>
    </div>

    <!-- 2. db.js -->
    <div class="section-card">
      <h2>🗄️ Database Setup & Migrations <span class="path">db.js</span></h2>
      <pre><code>${escapeHtml(getFileContent('db.js'))}</code></pre>
    </div>

    <!-- 3. server.js -->
    <div class="section-card">
      <h2>⚙️ API Express Server <span class="path">server.js</span></h2>
      <pre><code>${escapeHtml(getFileContent('server.js'))}</code></pre>
    </div>

    <!-- 4. index.html -->
    <div class="section-card">
      <h2>🏠 Customer Front-end Portal <span class="path">public/index.html</span></h2>
      <pre><code>${escapeHtml(getFileContent('public/index.html'))}</code></pre>
    </div>

    <!-- 5. style.css -->
    <div class="section-card">
      <h2>🎨 Premium Mechanic CSS Stylesheet <span class="path">public/css/style.css</span></h2>
      <pre><code>${escapeHtml(getFileContent('public/css/style.css'))}</code></pre>
    </div>

    <!-- 6. app.js -->
    <div class="section-card">
      <h2>🏍️ Dynamic Client Script <span class="path">public/js/app.js</span></h2>
      <pre><code>${escapeHtml(getFileContent('public/js/app.js'))}</code></pre>
    </div>

    <!-- 7. admin.html -->
    <div class="section-card">
      <h2>👑 Owner Dashboard Shell <span class="path">public/admin.html</span></h2>
      <pre><code>${escapeHtml(getFileContent('public/admin.html'))}</code></pre>
    </div>

    <!-- 8. admin.js -->
    <div class="section-card">
      <h2>📊 Owner Console Script <span class="path">public/js/admin.js</span></h2>
      <pre><code>${escapeHtml(getFileContent('public/js/admin.js'))}</code></pre>
    </div>

  </div>
</body>
</html>
`;

try {
  fs.writeFileSync(path.join(workspaceRoot, 'public/source_code_export.html'), htmlOutput, 'utf8');
  console.log('✓ Successfully generated public/source_code_export.html!');
} catch (err) {
  console.error('Failed to generate export file:', err);
}
