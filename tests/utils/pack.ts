import * as fs from "fs";
import { execa } from "execa";

export const pack = async (
  name: string,
  npmPackName: string = name,
  cwd: URL
) => {
  const doneLocation = new URL(`.done-pack.${name}`, cwd);
  if (fs.existsSync(doneLocation))
    return new URL(fs.readFileSync(doneLocation, "utf-8"));

  const p = await execa("npm", ["pack", "--offline", npmPackName], {
    cwd: cwd,
  });

  const pathPackage = p.stdout;

  const packLocation = new URL(pathPackage, cwd);

  fs.writeFileSync(doneLocation, packLocation.toString(), "utf-8");

  return packLocation;
};
