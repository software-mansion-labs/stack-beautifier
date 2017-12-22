#!/usr/bin/env node

'use strict';

const fs = require('fs');
const sourceMap = require('source-map');
const readline = require('readline');
const commander = require('commander');

const program = new commander.Command('stack-beautifier');
program.arguments('<mapFilename>');
program.option(
  '-t, --trace [input_file]',
  'Read stack trace from the input file (stdin is used when this option is not set)'
);
program.option(
  '-o, --output [output_file]',
  'Write result into the given output file (stdout is used when this option is not set)'
);
program.option(
  '-l, --long',
  'Output complete javascript filenames in the stacktrace (tool will try to shorten file paths by default)'
);

const pkg = require('./package.json');
program.version(pkg.version);
program.usage('[options] <app.js.map>');
program.description(
  'stack-beautifier is a simple tool for decrypting stack traces coming from the minified JS code.'
);
program.on('--help', () => {
  console.log(`\
  Examples:

    $ stack-beautifier app.js.map
    $ stack-beautifier -t trace.txt app.js.map

  See more:

  https://github.com/swmansion/stack-beautifier
  `);
});
program.action(mapFilename => {
  main(program);
});
program.parse(process.argv);
if (!program.args.length) {
  program.help();
}

const STACK_LINE_MATCHERS = [
  { regex: /^(.*)\@(\d+)\:(\d+)$/, idx: [1, 2, 3] }, // Format: someFun@13:12
  { regex: /^at (.*)\:(\d+)\:(\d+)$/, idx: [1, 2, 3] }, // Format: at filename:13:12
  { regex: /^at (.*) \((.*)\:(\d+)\:(\d+)\)$/, idx: [1, 3, 4] }, // Format: at someFun (filename:13:12)
  { regex: /^at (.*)\:(\d+)$/, idx: [1, 2, 3] }, // Format: at filename:13
];

function main(program) {
  const mapFilename = program.args[0];
  const traceFilename = program.trace;
  const outputFilename = program.output;

  const rl = readline.createInterface({
    input: traceFilename ? fs.createReadStream(traceFilename) : process.stdin,
  });

  const sourceMapConsumer = new sourceMap.SourceMapConsumer(
    fs.readFileSync(mapFilename, 'utf8')
  );

  const lines = [];
  rl.on('line', line => {
    lines.push(line.trim());
  });
  rl.on('close', () => {
    const stack = processStack(lines, sourceMapConsumer);
    const data = formatStack(stack, !program.long);
    if (outputFilename) {
      fs.writeFileSync(outputFilename, data);
    } else {
      process.stdout.write(data);
      process.stdout.write('\n');
    }
  });
}

function processMatchedLine(match, sourceMapConsumer) {
  return sourceMapConsumer.originalPositionFor({
    line: Number(match.line),
    column: Number(match.column || 0),
    name: match.name,
  });
}

function matchStackLine(line) {
  const found = STACK_LINE_MATCHERS.find(m => {
    return m.regex.test(line);
  });
  if (found) {
    const match = line.match(found.regex);
    return {
      name: match[found.idx[0]],
      line: match[found.idx[1]],
      column: match[found.idx[2]],
    };
  }
  return null;
}

function processStack(lines, sourceMapConsumer) {
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = matchStackLine(line);
    if (!match) {
      if (i === 0) {
        // we allow first line to contain trace message, we just pass it through to the result table
        result.push({ text: line });
      } else if (!line) {
        // we treat empty stack trace line as the end of an input
        break;
      } else {
        throw new Error(`Stack trace parse error at line ${i + 1}: ${line}`);
      }
    } else {
      result.push(processMatchedLine(match, sourceMapConsumer));
    }
  }
  return result;
}

function formatStack(lines, shorten) {
  let replacePrefix = '';
  if (shorten) {
    const sources = lines.filter(r => r.source).map(r => r.source);
    if (sources.length > 1) {
      let prefix = sources[0];
      sources.forEach(s => {
        while (
          prefix !== s.slice(0, prefix.length) ||
          prefix.indexOf('node_modules') !== -1
        ) {
          prefix = prefix.slice(0, -1);
        }
      });
      if (prefix !== sources[0]) {
        replacePrefix = prefix;
      }
    }
  }
  return lines
    .map(r => {
      if (r.text) {
        return r.text;
      } else if (!r.source) {
        return '  at <unknown>';
      } else {
        const source =
          replacePrefix && r.source.startsWith(replacePrefix)
            ? './' + r.source.slice(replacePrefix.length)
            : r.source;
        if (r.name) {
          return `  at ${r.name} (${source}:${r.line}:${r.column})`;
        } else {
          return `  at ${source}:${r.line}:${r.column}`;
        }
      }
    })
    .join('\n');
}
