import { describe, it, beforeAll, afterAll, TestContext } from "vitest";
import { demoWorkspace } from "@jondotsoy/demo-workspace";
import * as fs from "fs";
import { createInterface } from "docker_child_process";
import { pack } from "./utils/pack";

class ResultTest {
  name: string;
  state: string = "success";
  constructor(ctx: TestContext) {
    this.name = ctx.meta.name;
    ctx.onTestFailed((result) => {
      this.state = result.state;
    });
  }
}

class ReportGroup {
  resultTests: ResultTest[] = [];

  constructor(readonly name: string) {}

  attachContextTest(ctx: TestContext) {
    this.resultTests.push(new ResultTest(ctx));
  }
}

const report = new (class Report {
  readonly groups: ReportGroup[] = [];
  createGroup(groupName: string) {
    const reportGroup = new ReportGroup(groupName);
    this.groups.push(reportGroup);
    return reportGroup;
  }
})();

afterAll(() => {
  fs.writeFileSync(
    "compatibility.json",
    JSON.stringify(report, null, 2),
    "utf-8"
  );
});

let continueDemoWorkspaceCounter = 0;
const continueDemoWorkspace = () => {
  const w = demoWorkspace({
    workspaceName: `Space${continueDemoWorkspaceCounter++}`,
  });
  w.file("package.json", JSON.stringify({}));
  return w;
};

describe("e2e", () => {
  const packWorkspace = demoWorkspace({ workspaceName: "packs" });
  let envusePackLocation: URL;
  let dotenvPackLocation: URL;

  /**
   * Get the packs for use.
   */
  beforeAll(async () => {
    const pwd = new URL("..", import.meta.url);

    envusePackLocation = await pack(
      "envuse",
      pwd.toString(),
      packWorkspace.cwd
    );
    dotenvPackLocation = await pack("dotenv", undefined, packWorkspace.cwd);
  });

  for (const imagen of [
    "node:15",
    "node:16",
    "node:17",
    "node:18",
    "node:19",
  ]) {
    describe(`${imagen}`, () => {
      const reportGroup = report.createGroup(imagen);
      const workspace = continueDemoWorkspace();
      const dockerInterface = createInterface({ imagen, cwd: workspace.cwd });
      const exec = (command: string) =>
        dockerInterface.exec(command, { silent: true });

      beforeAll(async () => {
        await dockerInterface.init();
        await dockerInterface.cp(dotenvPackLocation, "dotenv.tgz");
        await dockerInterface.cp(envusePackLocation, "envuse.tgz");
      });
      afterAll(() => dockerInterface.kill());

      it("should install package", async (ctx) => {
        reportGroup.attachContextTest(ctx);
        await exec(`npm add envuse.tgz`);
      }, 15_000);

      it("should parse envuse file", async (ctx) => {
        reportGroup.attachContextTest(ctx);
        workspace.file(`.envuse`, `FOO="bar"`);
        workspace.file(
          `app.mjs`,
          `
          import { parse } from "envuse";
          parse(".envuse");
        `
        );

        await exec(`npm add envuse.tgz`);
        await exec(`node app.mjs`);
      }, 15_000);

      it("should import `envuse/config` module (ESM)", async (ctx) => {
        reportGroup.attachContextTest(ctx);
        workspace.file(`.envuse`, `FOO="bar"`);
        workspace.file(
          `app.mjs`,
          `
          import { config } from "envuse/config";
          console.log(config);
        `
        );

        await exec(`npm add dotenv.tgz`);
        await exec(`npm add envuse.tgz`);
        await exec(`node app.mjs`);
      }, 15_000);

      it("should import `envuse/config` module (CJS)", async (ctx) => {
        reportGroup.attachContextTest(ctx);
        workspace.file(`.envuse`, `FOO="bar"`);
        workspace.file(
          `app.cjs`,
          `
          const { config } = require("envuse/config");
          console.log(config);
        `
        );

        await exec(`npm add dotenv.tgz`);
        await exec(`npm add envuse.tgz`);
        await exec(`node app.cjs`);
      }, 15_000);
    });
  }
});
