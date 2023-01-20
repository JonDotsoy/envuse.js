export class ProgramError extends Error {
  constructor(
    message: string,
    readonly location: string | undefined,
    readonly span: any,
    readonly cause: any
  ) {
    super(message);
    this.name = "ProgramError";
  }
}
