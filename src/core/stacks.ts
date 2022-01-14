import _ from 'radash'
import * as yup from 'yup'
import { AnySchema } from 'yup'
import * as t from './types'


export const stacks: t.StackKey[] = [
  'api:aws:lambda',
  'task-runner:aws:code-build',
  'static-website:aws:s3'
]

const schemas = {
  'api:aws:lambda': yup.object({
    timeout: yup.number().min(1).max(60).required(),
    memory: yup.number().min(128).max(10240).required()
  }),
  'task-runner:aws:code-build': yup.object({
    buildTimeoutSeconds: yup.number().min(5).max(480).required(),
    useBridgeApi: yup.boolean().required(),
    buildCommand: yup.string().required(),
    dockerImage: yup.string().required(),
    bridgeApiKey: yup.string().when('useBridgeApi', {
      is: true,
      then: yup.string().required()
    })
  }),
  'static-website:aws:s3': yup.object({
    distDir: yup.string().required(),
    buildCommand: yup.string().required(),
    preBuildCommand: yup.string().required()
  })
} as any as Record<t.StackKey, AnySchema>

function validateStackConfig(message?: string) {
  return this.test('stackConfig', message, function (value: any) {
    const { path, createError } = this
    if (!value) {
      return createError({ path, message: message ?? 'stack config is required' })
    }
    const schema = schemas[value.stack as t.StackKey]
    if (!schema) {
      return createError({ path, message: message ?? 'stack config requires valid stack key' })
    }
    try {
      schema.validateSync(value)
    } catch (err) {
      return createError({ path, message: err })
    }
    return true
  })
}

yup.addMethod(yup.mixed, 'stackConfig', validateStackConfig)

export const stackConfigValidator = (y: typeof yup) => {
  return (y as any).mixed().stackConfig() as AnySchema
}