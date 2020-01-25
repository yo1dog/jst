const USAGE =
`USAGE:
jst [-s] [-m] [-r] [-p] javascript

Javascript should be a function that accepts a single param which is stdin.

-s: Read stdin as a string (dont attempt to parse as JSON).
-m: Output the input value.
-r: Serialize primitive types (strings, numbers, etc) as JSON
-p: Pretty print output JSON.

---- Examples ----
Extract Property Value:
echo '{"fu": {"bar": 5, "asdf": 6}}' | jst 'x => x.fu.bar'
# 6

Extract Complex Value:
echo '{"fu": {"bar": 5, "asdf": 6}}' | jst 'x => x.fu.bar + x.fu.asdf'
# 11

Transform Input and Pass Through:
echo '{"fu": {"bar": 5, "asdf": 6}}' | jst -m 'x => x.fu.bar += 10'
# {"fu":{"bar":15,"asdf":6}}

Create New Object:
echo '{"fu": {"bar": 5, "asdf": 6}}' | jst 'x => ({fubar: x.fu.bar, asdf: x.fu.asdf})'
# {"fubar":15,"asdf":6}

String Transformation:
echo 'hello world' | jst -s 'x => x.replace(/o/g, "0")'
# hell0 w0rld

Full Function:
echo '{"fu": {"bar": 5, "asdf": 6}}' | jst 'x => {
  if (x.fu.bar > 3) {
    return "yes";
  }
  return "no";
}'
# yes`;

let parseAsJson     = true;
let prettyPrint     = false;
let useMappingMode  = false;
let alwaysSerailize = false;
let jsStr;
let jsStrSet = false;

for (let i = 2; i < process.argv.length; ++i) {
  const arg = process.argv[i];
  
  if (arg[0] === '-') {
    for (let i = 1; i < arg.length; ++i) {
      switch (arg[i]) {
        case 's': parseAsJson     = false; break;
        case 'm': useMappingMode  = true ; break;
        case 'r': alwaysSerailize = true ; break;
        case 'p': prettyPrint     = true ; break;
      }
    }
  }
  else {
    if (jsStrSet) {
      console.error('Only 1 positional argument allowed.');
      return process.exit(1);
    }
    jsStr = arg;
    jsStrSet = true;
  }
}

if (!jsStrSet) {
  console.error(USAGE);
  process.exit(1);
}

// read from stdin
function readStdin(cb) {
  if (process.stdin.isTTY) {
    return cb(null, '');
  }
  
  let stdinStr = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('readable', () => {
    stdinStr += process.stdin.read() || '';
  });
  process.stdin.on('end', () => {
    return cb(null, stdinStr);
  });
  process.stdin.on('error', cb);
}

readStdin((err, stdinStr) => {
  if (err) throw err;
  
  if (!stdinStr) {
    return process.exit(0);
  }
  
  
  let stdinVal = stdinStr;
  
  if (parseAsJson) {
    try {
      stdinVal = JSON.parse(stdinStr);
    } catch(err) {
      console.error('Invalid JSON: ' + err.message);
      return process.exit(1);
    }
  }
  
  // eslint-disable-next-line no-eval
  let outputVal = eval(`
    (${jsStr})(stdinVal)
  `);
  
  if (useMappingMode) {
    outputVal = stdinVal;
  }
  
  let outputStr;
  if (typeof outputVal === 'object' || alwaysSerailize) {
    outputStr = JSON.stringify(outputVal, null, prettyPrint? 2 : 0) || '';
  }
  else {
    outputStr = String(outputVal);
  }
  
  process.stdout.write(outputStr + (prettyPrint? '\n' : ''));
  return process.exit(0);
});