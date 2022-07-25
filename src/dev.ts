import { start } from '@exobase/local'
import { map } from 'radash'
import * as glob from 'glob'
import path from 'path'
import * as lama from 'aws-lama'

const funcs = glob.sync('src/modules/**/*.ts').map(p => path.join(process.cwd(), p))

const run = async () => start({
  port: process.env.PORT ?? '7705',
  functions: await map(funcs, async funcPath => ({
    path: funcPath,
    url: funcPath.replace(/^.+?modules/, '').replace(/\.ts$/, ''),
    handler: (await import(funcPath)).default
  })),
  framework: {
    toArgs: async (req, res) => {
      const { event, context } = await lama.toEventContext(req, res)
      return [event, context]
    },
    toRes: async (req, res, result) => {
      lama.toHttpResponse(result, res)
    }
  }
}, (p) => {
  console.log(`API running at http://localhost:${p}`)
})
 
run().catch((err) => {
  console.error(err)
  process.exit(1)
})