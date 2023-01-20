import { loadEnvuse, Program, Variable } from "@envuse/wasm";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import {
  AnyTypeDTSFile,
  ExportDTSFile,
  FieldDTSFile,
  InterfaceDTSFile,
  KeywordDTSFile,
  NullTypeDTSFile,
  PrimitiveBooleanTypeDTSFile,
  PrimitiveNumberTypeDTSFile,
  PrimitiveStringTypeDTSFile,
  UnionDTSFile,
} from "./utils/dts_file.mjs";
import { ParseOptions } from "./parse_options.mjs";
import { ProgramError } from "./program_error.mjs";

const DEFAULT_DEF_FILE_LOCATION = new URL("../.def.json", import.meta.url);
const DEFAULT_TYPES_FILE_LOCATION = new URL(
  "../storeTypeReference.d.ts",
  import.meta.url
);

const toObject = <T extends Record<string, any>>(val: unknown): T => {
  if (val instanceof Map) {
    return Object.fromEntries(val);
  }
  throw new Error("Unsupported transform values");
};

const envuse = loadEnvuse();

export const createProgram = (source: string, location?: string): Program =>
  envuse.create_program(source, location);

export const createProgramFromFile = async (
  urlLike: string | URL
): Promise<Program> => {
  const location = new URL(urlLike, `file://${process.cwd()}/`);
  const source = await readFile(location, "utf-8");
  return createProgram(source, location.toString());
};

export const createProgramFromFileSync = (urlLike: string | URL): Program => {
  const location = new URL(urlLike, `file://${process.cwd()}/`);
  const source = readFileSync(location, "utf-8");
  return createProgram(source, location.toString());
};

export const createDTSFile = (
  program: Program,
  interfaceName: string
): InterfaceDTSFile => {
  const interfaceResult = new InterfaceDTSFile(interfaceName, []);

  for (const element of program.ast.Document.elements) {
    const isVariable = (elm: unknown): elm is { Variable: Variable } =>
      typeof elm === "object" && elm !== null && "Variable" in elm;

    if (isVariable(element)) {
      const variable_type: string = element.Variable.variable_type ?? "string";

      const dtsTypeValue = (() => {
        switch (variable_type) {
          case "boolean":
            return new PrimitiveBooleanTypeDTSFile();
          case "number":
            return new PrimitiveNumberTypeDTSFile();
          case "string":
            return new PrimitiveStringTypeDTSFile();
          default:
            return new AnyTypeDTSFile();
        }
      })();

      interfaceResult.fields.push(
        new FieldDTSFile(
          element.Variable.name,
          element.Variable.nullable
            ? new UnionDTSFile([new NullTypeDTSFile(), dtsTypeValue])
            : dtsTypeValue
        )
      );
    }
  }

  return interfaceResult;
};

abstract class StoreTypeReference {
  stored: Map<string, string>;
  definitionURL: URL;
  typesURL: URL;

  constructor(
    readonly definitionURLLike: string | URL,
    readonly typesURLLike: string | URL,
    readonly cwd: URL | string = process.cwd(),
    readonly encode: BufferEncoding = "utf-8"
  ) {
    this.stored = new Map<string, string>();
    const cwdUrl = cwd instanceof URL ? cwd : `file:///${cwd}/`;
    this.definitionURL = new URL(definitionURLLike, cwdUrl);
    this.typesURL = new URL(typesURLLike, cwdUrl);
  }

  abstract pull(): Promise<void> | void;
  abstract sync(): Promise<void> | void;

  async attachInterfaceDTSFile(interfaceDTSFile: InterfaceDTSFile) {
    this.stored.set(interfaceDTSFile.name, interfaceDTSFile.toString());
  }
}

export class StoreTypeReferenceSync extends StoreTypeReference {
  sync() {
    writeFileSync(
      this.definitionURL,
      JSON.stringify(Array.from(this.stored.entries()), null, 2)
    );

    const mapParsers = new InterfaceDTSFile("MapParsers", []);

    for (const [name] of this.stored) {
      mapParsers.fields.push(new FieldDTSFile(name, new KeywordDTSFile(name)));
    }

    writeFileSync(
      this.typesURL,
      `${Array.from(this.stored.values()).join(
        "\n\n"
      )}\n\n\n${new ExportDTSFile(mapParsers)}`
    );
  }
  pull() {
    try {
      const raw = JSON.parse(readFileSync(this.definitionURL, "utf-8"));
      if (Array.isArray(raw)) {
        this.stored = new Map(raw);
      }
    } catch (ex) {
      if (ex instanceof Error && "code" in ex && ex.code === "ENOENT") return;
      throw ex;
    }
  }
}

export class StoreTypeReferenceAsync extends StoreTypeReference {
  async sync() {
    await writeFile(
      this.definitionURL,
      JSON.stringify(Array.from(this.stored.entries()), null, 2)
    );

    const mapParsers = new InterfaceDTSFile("MapParsers", []);

    for (const [name] of this.stored) {
      mapParsers.fields.push(new FieldDTSFile(name, new KeywordDTSFile(name)));
    }

    await writeFile(
      this.typesURL,
      `${Array.from(this.stored.values()).join(
        "\n\n"
      )}\n\n\n${new ExportDTSFile(mapParsers)}`
    );
  }
  async pull() {
    try {
      const raw = JSON.parse(await readFile(this.definitionURL, "utf-8"));
      if (Array.isArray(raw)) {
        this.stored = new Map(raw);
      }
    } catch (ex) {
      if (ex instanceof Error && "code" in ex && ex.code === "ENOENT") return;
      throw ex;
    }
  }
}

const isRecord = (ex: unknown): ex is Record<any, any> =>
  typeof ex === "object" && ex !== null;

const isProgramError = (
  ex: unknown
): ex is { name: "ProgramError" } & Record<any, any> =>
  isRecord(ex) &&
  Object.getOwnPropertyDescriptor(ex, "name")?.value === "ProgramError";

function helpBeautifulEnvuseErrors<E = unknown>(error: E): ProgramError | E {
  if (isProgramError(error)) {
    return new ProgramError(error.message, error.location, error.span, error);
  }
  return error;
}

type MapTypes = import("../storeTypeReference").MapParsers;
type F<T extends string> = MapTypes extends { [k in T]: infer R }
  ? R
  : Record<string, any>;

export const parse = <T extends string>(
  relativePath: T,
  options?: ParseOptions
): F<T> => {
  try {
    const locationURL = new URL(
      relativePath,
      options?.cwd ?? `file://${process.cwd()}/`
    );
    const defFileLocation =
      options?.defFileLocation ?? DEFAULT_DEF_FILE_LOCATION;
    const typesFileLocation =
      options?.typesFileLocation ?? DEFAULT_TYPES_FILE_LOCATION;

    const storeTypeReference = new StoreTypeReferenceSync(
      defFileLocation,
      typesFileLocation
    );

    storeTypeReference.pull();

    const program = createProgramFromFileSync(locationURL);
    storeTypeReference.attachInterfaceDTSFile(
      createDTSFile(program, relativePath)
    );

    storeTypeReference.sync();

    return toObject<F<T>>(
      envuse.parser_values(program, options?.envs ?? process.env)
    );
  } catch (ex) {
    throw helpBeautifulEnvuseErrors(ex);
  }
};

export const parseAsync = async <T extends string>(
  relativePath: T,
  options?: ParseOptions
): Promise<F<T>> => {
  try {
    const locationURL = new URL(
      relativePath,
      options?.cwd ?? `file://${process.cwd()}/`
    );
    const defFileLocation =
      options?.defFileLocation ?? DEFAULT_DEF_FILE_LOCATION;
    const typesFileLocation =
      options?.typesFileLocation ?? DEFAULT_TYPES_FILE_LOCATION;

    const storeTypeReference = new StoreTypeReferenceAsync(
      defFileLocation,
      typesFileLocation
    );

    await storeTypeReference.pull();

    const program = await createProgramFromFile(locationURL);
    await storeTypeReference.attachInterfaceDTSFile(
      createDTSFile(program, relativePath)
    );

    await storeTypeReference.sync();

    return toObject<F<T>>(
      envuse.parser_values(program, options?.envs ?? process.env)
    );
  } catch (ex) {
    throw helpBeautifulEnvuseErrors(ex);
  }
};
