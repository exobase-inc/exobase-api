import _ from 'radash'
import config from '../../core/config'
import { PushEvent } from '@octokit/webhooks-types'
// import { useGithubWebhook, GithubWebhookArgs } from 'exo-use-github-webhook'
import type { Props } from '@exobase/core'
import { useService } from '@exobase/hooks'
import { useLambda } from '@exobase/lambda'

interface Args {}
interface Services {}
type Response = void

type GithubWebhookArgs = any

/**
 * We're really just looking at the event/action here
 * and routing to the correct handler function for 
 * that specific event.
 */
async function handleGithubEvent(props: Props<GithubWebhookArgs, Services>): Promise<Response> {
  const { event, action } = props.args
  if (event === 'push') return await handlePush(props)
  console.warn(`No handler found for github webhook event (${event}) and action (${action})`)
}

async function handlePush({ args, services }: Props<GithubWebhookArgs, Services>): Promise<void> {
//   const { api } = services
//   const payload = args.payload as PushEvent
  
//   // 1. Request all services that use this repo from api
//   const { error, data: { services: linkedServices } } = await api.services.listByRepositoryId({ 
//     repositoryId: `${payload.repository.id}`
//   }, { token: config.exobaseToken })
//   if (error) {
//     console.error(error)
//     return
//   }
  
//   // 2. Filter results for items that match the event branch/ref
//   const matchedServices = linkedServices.filter(s => {
//     return payload.base_ref === `refs/heads/${s.source.branch}`
//   })

//   // 3. Request deployService for all remaining items
//   for (const service of matchedServices) {
//     await api.services.automatedDeploy({
//       serviceId: service.id,
//       platformId: service.platformId
//     }, { token: config.exobaseToken })
//   }
}

export default _.compose(
  useLambda(),
//   useGithubWebhook(''),
  handleGithubEvent
)