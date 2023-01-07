import { loadEnvuse, Program, Variable } from "@envuse/wasm";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { cwd } from "node:process";
import {
  AnyTypeDTSFile,
  DTSFile,
  ExportDTSFile,
  FieldDTSFile,
  InterfaceDTSFile,
  KeywordDTSFile,
  NullTypeDTSFile,
  PrimitiveBooleanTypeDTSFile,
  PrimitiveNumberTypeDTSFile,
  PrimitiveStringTypeDTSFile,
  UnionDTSFile,
} from "./utils/dtsfile.mjs";

const envuse = loadEnvuse();

export const createProgram = (source: string, location?: string): Program =>
  envuse.create_program(source, location);
export const createProgramFromFile = async (
  urlLike: string | URL
): Promise<Program> => {
  const location = new URL(urlLike, `file://${cwd()}/`);
  const source = await readFile(location, "utf-8");
  return createProgram(source, location.toString());
};

export const createProgramFromFileSync = (urlLike: string | URL): Program => {
  const location = new URL(urlLike, `file://${cwd()}/`);
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

export const createStoreTypeReference = (
  definitionURLLike: string | URL,
  typesURLLike: string | URL
) => {
  const definitionURL = new URL(definitionURLLike, `file:///${cwd()}/`);
  const typesURL = new URL(typesURLLike, `file:///${cwd()}/`);

  let stored = new Map<string, string>();

  return {
    pull: async () => {
      try {
        stored = new Map(JSON.parse(await readFile(definitionURL, "utf-8")));
      } catch (ex) {
        if (ex instanceof Error && "code" in ex && ex.code === "ENOENT") return;
        throw ex;
      }
    },
    pullSync: () => {
      try {
        const raw = JSON.parse(readFileSync(definitionURL, "utf-8"));
        if (Array.isArray(raw)) {
          stored = new Map(raw);
        }
      } catch (ex) {
        if (ex instanceof Error && "code" in ex && ex.code === "ENOENT") return;
        throw ex;
      }
    },
    sync: async () => {
      await writeFile(
        definitionURL,
        JSON.stringify(Array.from(stored.entries()), null, 2)
      );

      const mapParsers = new InterfaceDTSFile("MapParsers", []);

      for (const [name] of stored) {
        mapParsers.fields.push(
          new FieldDTSFile(name, new KeywordDTSFile(name))
        );
      }

      await writeFile(
        typesURL,
        `${Array.from(stored.values()).join("\n\n")}\n\n\n${new ExportDTSFile(
          mapParsers
        )}`
      );
    },
    syncSync: () => {
      writeFileSync(
        definitionURL,
        JSON.stringify(Array.from(stored.entries()), null, 2)
      );

      const mapParsers = new InterfaceDTSFile("MapParsers", []);

      for (const [name] of stored) {
        mapParsers.fields.push(
          new FieldDTSFile(name, new KeywordDTSFile(name))
        );
      }

      writeFileSync(
        typesURL,
        `${Array.from(stored.values()).join("\n\n")}\n\n\n${new ExportDTSFile(
          mapParsers
        )}`
      );
    },
    attachInterfaceDTSFile: async (interfaceDTSFile: InterfaceDTSFile) => {
      stored.set(interfaceDTSFile.name, interfaceDTSFile.toString());
    },
  };
};

type MapParsers = import("./storeTypeReference").MapParsers;
type F<T extends string> = MapParsers extends { [k in T]: infer R }
  ? R
  : Record<string, any>;

export const parse = <T extends string>(relativePath: T): F<T> => {
  const locationURL = new URL(relativePath, `file://${cwd()}/`);
  const defFileLocation = new URL(".def.json", import.meta.url);
  const typesFileLocation = new URL("storeTypeReference.d.ts", import.meta.url);

  const storeTypeReference = createStoreTypeReference(
    defFileLocation,
    typesFileLocation
  );

  storeTypeReference.pullSync();

  const program = createProgramFromFileSync(locationURL);
  storeTypeReference.attachInterfaceDTSFile(
    createDTSFile(program, relativePath)
  );

  storeTypeReference.syncSync();

  return envuse.parser_values(program, process.env) as F<T>;
};

export const parseAsync = async <T extends string>(
  relativePath: T
): Promise<F<T>> => {
  const locationURL = new URL(relativePath, `file://${cwd()}/`);
  const defFileLocation = new URL(".def.json", import.meta.url);
  const typesFileLocation = new URL("storeTypeReference.d.ts", import.meta.url);

  const storeTypeReference = createStoreTypeReference(
    defFileLocation,
    typesFileLocation
  );

  await storeTypeReference.pull();

  const program = await createProgramFromFile(locationURL);
  await storeTypeReference.attachInterfaceDTSFile(
    createDTSFile(program, relativePath)
  );

  await storeTypeReference.sync();

  return envuse.parser_values(program, process.env) as F<T>;
};
