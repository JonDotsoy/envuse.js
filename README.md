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

