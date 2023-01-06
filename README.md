# Envuse

![.envuse](./assets/brand/brand%40250w.png)

Module to load environment variables from a `.envuse` file. Ideal to load configurations from the environment system, transform values and configure default values.

## Install

```sh
npm i --save envuse
```

## Usage

Create your `.envuse` file. 

```envuse
DB_URI
PORT:Number=3000
```

and load with the `parse(string)` function.

```ts
import { parse } from "envuse"

const config = parse(".envuse")
```

## Compatibility

|                                         | node:13 | node:14 | node:15 | node:16 | node:17 | node:18 | node:19 |
| ---                                     | ---     | ---     | ---     | ---     | ---     | ---     | ---     |
| ECMAScript modules/Import Package       | Error   | Yes     | Yes     | Yes     | Yes     | Yes     | Yes     |
| CommonJS modules/Import Package         | Error   | Yes     | Error   | Yes     | Yes     | Yes     | Yes     |
| CommonJS (JS) modules/Import Package    | Error   | Yes     | Error   | Yes     | Yes     | Yes     | Yes     |
| ECMAScript modules/Parse Envuse File    | Error   | Yes     | Yes     | Yes     | Yes     | Yes     | Yes     |
| CommonJS modules/Parse Envuse File      | Error   | Yes     | Error   | Yes     | Yes     | Yes     | Yes     |
| CommonJS (JS) modules/Parse Envuse File | Error   | Yes     | Error   | Yes     | Yes     | Yes     | Yes     |

