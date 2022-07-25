import * as _ from 'radash'
import config from '../../core/config'
// import { useStripeWebhook, StripeWebhookArgs } from 'exo-use-stripe-webhook'
import type { Props } from '@exobase/core'
import { useLambda } from '@exobase/lambda'

interface Args {}
interface Services {}
type Response = void

type StripeWebhookArgs = any

async function handleStripeEvent(props: Props<StripeWebhookArgs, Services>): Promise<Response> {
  const { type } = props.args
  if (type === 'checkout.session.completed') await handleCheckoutComplete(props)
  if (type === 'invoice.paid') await handleInvoicePaid(props)
  if (type === 'invoice.payment_failed') await handleFailedPayment(props)
  if (type === 'customer.subscription.deleted') await handleSubscriptionCanceled(props)
  console.warn(`No handler found for stripe webhook event (${type})`)
}

async function handleCheckoutComplete(_props: Props<StripeWebhookArgs, Services>): Promise<void> {

}

async function handleInvoicePaid(_props: Props<StripeWebhookArgs, Services>): Promise<void> {

}

async function handleFailedPayment(_props: Props<StripeWebhookArgs, Services>): Promise<void> {

}

async function handleSubscriptionCanceled(_props: Props<StripeWebhookArgs, Services>): Promise<void> {

}

export default _.compose(
  useLambda(),
  // useStripeWebhook({
  //   webhookSecret: '', // config.stripeWebhookSecret,
  //   stripeSecretKey: '', // config.stripeSecretKey
  // }),
  handleStripeEvent
)