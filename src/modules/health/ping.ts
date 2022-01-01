import _ from 'radash'
import { useLambda } from '@exobase/lambda'


interface Response {
  message: 'pong'
}

async function ping(): Promise<Response> {
  return {
    message: 'pong'
  }
}

export default _.compose(
  useLambda(),
  ping
)