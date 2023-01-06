import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  createDTSFile,
  createProgramFromFile,
  createStoreTypeReference,
  parseAsync,
} from "../envuse.mjs";
import {
  FieldDTSFile,
  InterfaceDTSFile,
  PrimitiveNumberTypeDTSFile,
  PrimitiveStringTypeDTSFile,
  UnionDTSFile,
} from "../utils/dtsfile.mjs";

describe("Sample 1", () => {
  it("should prepare envuse file", async () => {
    const testDirname = new URL("_sample-1/", import.meta.url);
    const envuseFile = new URL(".envuse", testDirname);

    expect(
      createDTSFile(await createProgramFromFile(envuseFile), "demo").toString()
    ).toMatchInlineSnapshot(`
      "interface demo {
        AAA: any
        FOO: null
        | number
        BAZ: string
        PORT: number
      }"
    `);
  });
});

describe("Sample 2: store of types", () => {
  it("create store type reference", async () => {
    const testDirname = new URL("_sample-2/", import.meta.url);
    const definitionURL = new URL("def.json", testDirname);
    const typesURL = new URL("types.ts", testDirname);
    const envuse1File = new URL(".envuse1", testDirname);
    const envuse2File = new URL(".envuse2", testDirname);

    const storeTypeReference = createStoreTypeReference(
      definitionURL,
      typesURL
    );

    expect(storeTypeReference).toBeTypeOf("object");
    expect(storeTypeReference).not.toBeNull();

    await storeTypeReference.pull();

    storeTypeReference.attachInterfaceDTSFile(
      new InterfaceDTSFile("a", [
        new FieldDTSFile("name", new PrimitiveStringTypeDTSFile()),
        new FieldDTSFile(
          "age",
          new UnionDTSFile([
            new PrimitiveStringTypeDTSFile(),
            new PrimitiveNumberTypeDTSFile(),
          ])
        ),
      ])
    );
    storeTypeReference.attachInterfaceDTSFile(new InterfaceDTSFile("c", []));
    storeTypeReference.attachInterfaceDTSFile(
      new InterfaceDTSFile(".envuse", [])
    );
    storeTypeReference.attachInterfaceDTSFile(
      new InterfaceDTSFile(".envuse.prod", [])
    );
    storeTypeReference.attachInterfaceDTSFile(
      new InterfaceDTSFile(".envuse/dev.env1", [])
    );
    storeTypeReference.attachInterfaceDTSFile(
      new InterfaceDTSFile(".envuse/prod.env", [])
    );

    await storeTypeReference.sync();

    expect(await readFile(definitionURL, "utf-8")).toMatchInlineSnapshot(`
      "[
        [
          \\"a\\",
          \\"interface a {\\\\n  name: string\\\\n  age: string\\\\n  | number\\\\n}\\"
        ],
        [
          \\"b\\",
          \\"interface b {\\\\n}\\"
        ],
        [
          \\"c\\",
          \\"interface c {\\\\n}\\"
        ],
        [
          \\".envuse\\",
          \\"interface _envuse {\\\\n}\\"
        ],
        [
          \\".envuse.prod\\",
          \\"interface _envuse_prod {\\\\n}\\"
        ],
        [
          \\".envuse/dev.env1\\",
          \\"interface _envuse_dev_env1 {\\\\n}\\"
        ],
        [
          \\".envuse/prod.env\\",
          \\"interface _envuse_prod_env {\\\\n}\\"
        ]
      ]"
    `);
    expect(await readFile(typesURL, "utf-8")).toMatchInlineSnapshot(`
      "interface a {
        name: string
        age: string
        | number
      }

      interface b {
      }

      interface c {
      }

      interface _envuse {
      }

      interface _envuse_prod {
      }

      interface _envuse_dev_env1 {
      }

      interface _envuse_prod_env {
      }


      export interface MapParsers {
        a: a
        b: b
        c: c
        \\".envuse\\": _envuse
        \\".envuse.prod\\": _envuse_prod
        \\".envuse/dev.env1\\": _envuse_dev_env1
        \\".envuse/prod.env\\": _envuse_prod_env
      }"
    `);
  });
});
