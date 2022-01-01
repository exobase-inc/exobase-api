import { getFunctionMap, start } from '@exobase/local'

start({
  port: '7700',
  functions: getFunctionMap(process.cwd()).map((f) => ({ ...f,
    func: require(f.paths.import).default
  }))
}, (p) => {
  console.log(`API running at http://localhost:${p}`)
})