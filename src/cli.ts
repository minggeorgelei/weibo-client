import { createProgram, KNOWN_COMMANDS } from "./cli/program";
import { createCliContext } from "./cli/shared";
import { resolveCliInvocation } from "./lib/cli-args";

const rawArgs: string[] = process.argv.slice(2);
const normalizedArgs: string[] =
  rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

const ctx = createCliContext(normalizedArgs);

const program = createProgram(ctx);

const { argv, showHelp } = resolveCliInvocation(normalizedArgs, KNOWN_COMMANDS);

if (showHelp) {
  program.outputHelp();
  process.exit(0);
}

if (argv) {
  program.parse(argv);
} else {
  program.parse(["node", "weibo", ...normalizedArgs]);
}
