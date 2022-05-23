import _ from 'radash'
import path from 'path'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import { getFunctionMap } from '@exobase/local'
import cmd from 'cmdish'
import fs from 'fs'

interface Func {
  module: string
  function: string
}

const whitelist = [
  // 'enrichEventOnChange'
]

const start = async () => {
  await cmd('rm -rf ./build')
  const functions = getFunctionMap({
    moduleDirectoryPath: path.join(__dirname, 'src/modules'),
    extensions: ['ts']
  })
  await fs.promises.writeFile(
    './.manifest.json',
    JSON.stringify({
      functions
    }),
    'utf8'
  )
  const [first, ...rest] = whitelist.length > 0 ? functions.filter(f => whitelist.includes(f.function)) : functions
  // Build one first so if there is an error our
  // machine doesn't spin out of control like a
  // nuclear meltdown building 30+ functions all
  // with errors.
  const [err] = await _.try(compile)(first)
  if (err) {
    console.error(err)
    return
  }
  // Group into 6 funcs to build at a time. Another
  // help to not melt my machine down
  const clusters = _.cluster(rest, 6)
  for (const funcs of clusters) {
    await Promise.allSettled(
      funcs.map(func => {
        return compile(func).catch(err => {
          console.error(err)
        })
      })
    )
  }
}

function compile(func: Func) {
  return new Promise<void>((res, rej) => {
    webpack(
      {
        entry: [`./src/modules/${func.module}/${func.function}.ts`],
        mode: (process.env.NODE_ENV as 'production' | 'development') ?? 'production',
        target: 'async-node14',
        output: {
          library: {
            type: 'commonjs2'
          },
          path: path.resolve(__dirname, 'build', 'modules', func.module),
          filename: `${func.function}.js`
        },
        resolve: {
          extensions: ['.ts', '.js']
        },
        module: {
          rules: [
            {
              test: /\.ts$/,
              use: ['ts-loader']
            }
          ]
        },
        optimization: {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              extractComments: false // false = do not generate LICENSE files
            })
          ]
        }
      },
      (err, stats) => {
        if (stats.hasErrors()) {
          rej({ errors: stats.toJson().errors })
        }
        if (err) {
          rej(err)
        }
        res()
      }
    )
  })
}

start()
