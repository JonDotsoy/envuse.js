interface a {
  name: string
  age: string
  | number
}

interface b {
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
  b: b
  c: c
  ".envuse": _0x46_envuse
  ".envuse.prod": _0x46_envuse_0x46_prod
  ".envuse/dev.env1": _0x46_envuse_0x47_dev_0x46_env1
  ".envuse/prod.env": _0x46_envuse_0x47_prod_0x46_env
}