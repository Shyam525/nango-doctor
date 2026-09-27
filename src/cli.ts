import * as fs   from 'fs';
import * as path from 'path';
import { diagnose } from './diagnoser';

const c = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',
  red:    '\x1b[31m', green:  '\x1b[32m',
  yellow: '\x1b[33m', cyan:   '\x1b[36m',
  white:  '\x1b[97m', gray:   '\x1b[90m',
};

function paint(color: string, text: string) {
  return `${color}${text}${c.reset}`;
}

function wrap(text: string, indent: string, width = 60): string {
  const words = text.split(' ');
  let line = indent;
  const lines: string[] = [];
  for (const word of words) {
    if ((line + word).length > width) {
      lines.push(line);
      line = indent + word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim()) lines.push(line);
  return lines.join('\n');
}

function printDiagnosis(result: any, filename: string) {
  const hr = paint(c.gray, '─'.repeat(52));
  console.log('');
  console.log(paint(c.bold + c.white, '  nango-doctor') + paint(c.gray, '  v0.1'));
  console.log(paint(c.gray, `  Analyzing: ${filename}`));
  console.log('');
  console.log(hr);

  if (!result.detected) {
    console.log('');
    console.log(paint(c.yellow, '  ⚠  No known pattern matched.'));
    console.log(paint(c.gray,   `     ${result.root_cause}`));
    console.log('');
    return;
  }

  const pct = Math.round(result.confidence * 100);
  const confColor = pct >= 90 ? c.green : pct >= 75 ? c.yellow : c.red;

  console.log('');
  console.log(paint(c.bold, '  Pattern     ') + paint(c.cyan,   result.pattern));
  console.log(paint(c.bold, '  Issue ref   ') + paint(c.white,  result.issue_ref));
  console.log(paint(c.bold, '  Confidence  ') + paint(confColor, `${pct}%`));
  console.log('');
  console.log(hr);

  console.log('');
  console.log(paint(c.bold, '  ROOT CAUSE'));
  console.log(paint(c.gray, wrap(result.root_cause, '  ')));

  console.log('');
  console.log(paint(c.bold, '  EVIDENCE'));
  for (const e of result.evidence) {
    console.log(paint(c.green, '  → ') + paint(c.gray, e));
  }

  console.log('');
  console.log(paint(c.bold, '  FIX'));
  console.log(paint(c.gray, wrap(result.fix, '  ')));

  if (result.issue_ref) {
    const num = result.issue_ref.replace('#', '');
    console.log('');
    console.log(
      paint(c.bold, '  GitHub      ') +
      paint(c.cyan, `https://github.com/NangoHQ/nango/issues/${num}`)
    );
  }

  console.log('');
  console.log(hr);
  console.log('');
}

function main() {
  const args    = process.argv.slice(2);
  const command = args[0];

  if (command !== 'analyze') {
    console.log('');
    console.log(paint(c.bold + c.white, '  nango-doctor v0.1'));
    console.log(paint(c.gray,           '  Usage: npx ts-node src/cli.ts analyze --file <path>'));
    console.log('');
    return;
  }

  const idx = args.indexOf('--file');
  if (idx === -1 || !args[idx + 1]) {
    console.error(paint(c.red, '  Error: --file <path> is required'));
    process.exit(1);
  }

  const filePath = path.resolve(args[idx + 1]);

  if (!fs.existsSync(filePath)) {
    console.error(paint(c.red, `  Error: file not found: ${filePath}`));
    process.exit(1);
  }

  let input: any;
  try {
    const raw    = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    input = parsed.input ?? parsed;
  } catch {
    console.error(paint(c.red, '  Error: could not parse JSON file'));
    process.exit(1);
  }

  const result = diagnose(input);
  printDiagnosis(result, path.basename(filePath));
}

main();