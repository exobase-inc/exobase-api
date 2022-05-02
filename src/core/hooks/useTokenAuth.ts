import { useTokenAuthentication } from '@exobase/auth'
import config from '../config'

export const useTokenAuth = () => useTokenAuthentication({
  type: 'id',
  iss: 'exo.api',
  tokenSignatureSecret: config.tokenSignatureSecret
})
