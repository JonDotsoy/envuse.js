type NewType = [number, string];

export abstract class DTSFile {
  abstract toLines(depth: number): Generator<NewType>;
  toString(depth: number = 0) {
    const lines: string[] = [];
    for (const [margin, line] of this.toLines(depth)) {
      lines.push(`${"  ".repeat(margin)}${line}`);
    }
    return lines.join("\n");
  }
}

export class InterfaceDTSFile extends DTSFile {
  nameKeyword: KeywordDTSFile;

  constructor(readonly name: string, readonly fields: FieldDTSFile[]) {
    super();
    this.nameKeyword = new KeywordDTSFile(name);
  }

  *toLines(depth: number): Generator<NewType> {
    yield [depth, `interface ${this.nameKeyword} {`];

    for (const field of this.fields) {
      yield* field.toLines(depth + 1);
    }

    yield [depth, `}`];
  }
}

export class ExportDTSFile extends DTSFile {
  constructor(readonly expression: DTSFile) {
    super();
  }
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `export ${this.expression.toString(depth)}`];
  }
}
export class KeywordDTSFile extends DTSFile {
  constructor(readonly raw: string) {
    super();
  }
  *toLines(depth: number): Generator<NewType> {
    yield [depth, this.raw.replace(/\W/g, "_")];
  }
}
export class StringDTSFile extends DTSFile {
  constructor(readonly raw: string) {
    super();
  }
  *toLines(depth: number): Generator<NewType> {
    yield [depth, JSON.stringify(this.raw)];
  }
}
export class AnyTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `any`];
  }
}
export class UndefinedTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `undefined`];
  }
}
export class NullTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `null`];
  }
}
export class UnionDTSFile extends DTSFile {
  constructor(readonly types: [DTSFile, ...DTSFile[]]) {
    super();
  }
  *toLines(depth: number): Generator<NewType> {
    const [fType, ...types] = this.types;
    yield [depth, `${fType}`];

    for (const y of types) {
      yield [depth, `| ${y}`];
    }
  }
}
/* Primitives types */
export class PrimitiveStringTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `string`];
  }
}
export class PrimitiveNumberTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `number`];
  }
}
export class PrimitiveBooleanTypeDTSFile extends DTSFile {
  *toLines(depth: number): Generator<NewType> {
    yield [depth, `boolean`];
  }
}
export type PrimitivesDTSFile =
  | PrimitiveStringTypeDTSFile
  | PrimitiveNumberTypeDTSFile
  | PrimitiveBooleanTypeDTSFile;

export class FieldDTSFile extends DTSFile {
  safeFieldName: DTSFile;

  constructor(readonly fieldName: string, readonly fieldValue: DTSFile) {
    super();
    this.safeFieldName = /\W/.test(fieldName)
      ? new StringDTSFile(fieldName)
      : new KeywordDTSFile(fieldName);
  }

  *toLines(depth: number): Generator<NewType> {
    yield [
      depth,
      `${this.safeFieldName}: ${this.fieldValue.toString(depth).trimStart()}`,
    ];
  }
}
