/** CLI arguments without the bare `--` that `pnpm <script> -- --flag` forwards. */
export function cliArgs(): string[] {
  return process.argv.slice(2).filter((arg) => arg !== "--")
}
