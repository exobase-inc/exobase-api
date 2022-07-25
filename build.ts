import * as _ from 'radash'
import path from 'path'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import cmd from 'cmdish'
import glob from 'glob'

const start = async () => {
  await cmd('rm -rf ./build')
  const functions = glob.sync('src/modules/**/*.ts')
  const [first, ...rest] = functions
  // Build one first so if there is an error our
  // machine doesn't spin out of control like a
  // nuclear meltdown building 30+ functions if
  // if they all have errors.
  await compile(first)
  await _.parallel(6, rest, compile)
}

function compile(funcPath: string) {
  const [_x, module, func] = funcPath.match(/\/([a-zA-Z_-]+?)\/([a-zA-Z_-]+?)\.ts/) as string[]
  console.log(`transpiling ${module}/${func}`)
  return new Promise<void>((res, rej) => {
    webpack(
      {
        entry: [`./src/modules/${module}/${func}.ts`],
        mode: (process.env.NODE_ENV as 'production' | 'development') ?? 'production',
        target: 'async-node14',
        output: {
          library: {
            type: 'commonjs2'
          },
          path: path.resolve(__dirname, 'build', 'modules', module),
          filename: `${func}.js`
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
