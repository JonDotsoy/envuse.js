export interface ParseOptions {
  cwd?: URL;
  defFileLocation?: URL;
  typesFileLocation?: URL;
  envs?: Record<string, string | undefined>;
  customTypes?: Record<string, (value: string) => any>;
}
