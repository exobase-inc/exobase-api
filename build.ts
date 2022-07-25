import * as _ from 'radash'
import path from 'path'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import cmd from 'cmdish'
import glob from 'glob'
import fs from 'fs'

const start = async () => {
  const functions = glob.sync('src/modules/**/*.ts')
  await cmd('rm -rf ./build')
  const [first, ...rest] = functions
  // Build one first so if there is an error our
  // machine doesn't spin out of control like a
  // nuclear meltdown building 30+ functions that
  // all have errors.
  await compile(first)
  await _.parallel(6, rest, compile)
  await cmd('rm ./.manifest.json')
  await manifest(functions)
}

const manifest = async (functions: string[]) => {
  const content = {
    functions: functions.map(p => ({
      source: p.replace(/src\/modules\//, 'build/').replace(/\.ts$/, '.js'), // => build/health/ping.js
      url: p.replace(/^.+modules\//, '/').replace(/\.ts$/, '') // => /health/ping
    }))
  }
  await fs.promises.writeFile(
    './.manifest.json',
    JSON.stringify(content, null, 2),
    'utf-8'
  )
}

const compile = async (func: string) => {
  console.log(`building ${func.replace(/src\/modules/, '')}`)
  return new Promise<void>((res, rej) => {
    webpack(
      {
        entry: [`./${func}`],
        mode: (process.env.NODE_ENV as 'production' | 'development') ?? 'production',
        target: 'async-node14',
        output: {
          library: {
            type: 'commonjs2'
          },
          path: path.resolve(__dirname, 'build', func.replace(/^src\/modules\//, '').replace(/\/([a-zA-Z_-]+)\.ts$/, '')),
          filename: func.replace(/\.ts$/, '.js').replace(/(.+)\//, '')
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
        if (stats?.hasErrors()) {
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

start().catch(err => {
  console.error(err)
  process.exit(1)
})
