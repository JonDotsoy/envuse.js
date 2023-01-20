import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  createDTSFile,
  createProgramFromFile,
  parse,
  StoreTypeReferenceAsync,
} from "../src/envuse.mjs";
import { ProgramError } from "../src/program_error.mjs";
import {
  FieldDTSFile,
  InterfaceDTSFile,
  PrimitiveNumberTypeDTSFile,
  PrimitiveStringTypeDTSFile,
  UnionDTSFile,
} from "../src/utils/dts_file.mjs";
import { demoWorkspace } from "@jondotsoy/demo-workspace";

describe("Sample 1", (ex) => {
  const workspace = demoWorkspace({ workspaceName: "Sample1" });

  beforeAll(() => {
    workspace.makeTree({
      ".envuse": `
        AAA: Unknown
        #
        FOO: number?
        # BAZ block comment
        BAZ = "IAM"
        #
        PORT: number = 3_000
      `,
    });
  });

  it("should prepare envuse file", async () => {
    const testDirname = workspace.cwd;
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

describe("Sample 2: store of types", (ex) => {
  const workspace = demoWorkspace({ workspaceName: "Sample2" });

  it("create store type reference", async () => {
    const testDirname = workspace.cwd;
    const definitionURL = new URL("def.json", testDirname);
    const typesURL = new URL("types.ts", testDirname);

    const storeTypeReference = new StoreTypeReferenceAsync(
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
          \\"c\\",
          \\"interface c {\\\\n}\\"
        ],
        [
          \\".envuse\\",
          \\"interface _0x46_envuse {\\\\n}\\"
        ],
        [
          \\".envuse.prod\\",
          \\"interface _0x46_envuse_0x46_prod {\\\\n}\\"
        ],
        [
          \\".envuse/dev.env1\\",
          \\"interface _0x46_envuse_0x47_dev_0x46_env1 {\\\\n}\\"
        ],
        [
          \\".envuse/prod.env\\",
          \\"interface _0x46_envuse_0x47_prod_0x46_env {\\\\n}\\"
        ]
      ]"
    `);
    expect(await readFile(typesURL, "utf-8")).toMatchInlineSnapshot(`
      "interface a {
        name: string
        age: string
        | number
      }

      interface c {
      }

      interface _0x46_envuse {
      }

      interface _0x46_envuse_0x46_prod {
      }

      interface _0x46_envuse_0x47_dev_0x46_env1 {
      }

      interface _0x46_envuse_0x47_prod_0x46_env {
      }


      export interface MapParsers {
        a: a
        c: c
        \\".envuse\\": _0x46_envuse
        \\".envuse.prod\\": _0x46_envuse_0x46_prod
        \\".envuse/dev.env1\\": _0x46_envuse_0x47_dev_0x46_env1
        \\".envuse/prod.env\\": _0x46_envuse_0x47_prod_0x46_env
      }"
    `);
  });
});

describe("Parse envuse files", (ex) => {
  const workspace = demoWorkspace({ workspaceName: "Sample3" });

  beforeAll(() => {
    workspace.makeTree({
      "1.envuse": `
        Foo
      `,
    });
  });

  it("should parse sample 1", () => {
    process.env.Foo = "3";
    const cwd = workspace.cwd;

    expect(
      parse("1.envuse", {
        cwd,
        defFileLocation: new URL(".def.json", cwd),
        typesFileLocation: new URL(".types.d.ts", cwd),
      })
    ).toEqual({
      Foo: { String: "3" },
    });
  });
});

describe("Presentation errors", (ctx) => {
  const workspace = demoWorkspace({ workspaceName: "Sample4" });
  beforeAll(() => {
    workspace.makeTree({
      ".def.json": "{}",
      ".types.d.ts": "",
      "1.envuse": `
        FO3143: String
      `,
    });
  });
  it("should format the null values", () => {
    let err: any;
    try {
      parse("1.envuse", {
        cwd: workspace.cwd,
        defFileLocation: new URL(".def.json", workspace.cwd),
        typesFileLocation: new URL(".types.d.ts", workspace.cwd),
      });
    } catch (ex) {
      err = ex;
    }

    expect(err).instanceOf(Error);

    expect(err.name).toMatchInlineSnapshot('"ProgramError"');
    expect(err).instanceOf(ProgramError);
    expect(err.location).toMatch(/\/1.envuse$/);
    expect(err.span).toMatchInlineSnapshot(`
      {
        "end": 14,
        "start": 0,
      }
    `);
  });
});
