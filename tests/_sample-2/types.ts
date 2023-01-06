interface a {
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
  ".envuse": _envuse
  ".envuse.prod": _envuse_prod
  ".envuse/dev.env1": _envuse_dev_env1
  ".envuse/prod.env": _envuse_prod_env
}