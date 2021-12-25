
const get = <T = string>(name: string, defaultValue: T = null, cast: (v: any) => T = (v) => v): T => {
    const val = process.env[name]
    if (!val) return defaultValue
    return cast(val)
}


const getRegion = (env: string) => {
    if (env === 'local') return 'us-east-1'
    if (env === 'dev') return 'us-east-1'
    if (env === 'staging') return 'us-east-1'
    if (env === 'prod') return 'us-east-1'
}

const env = get('LUNE_ENV')

const config = {
    env,
    region: getRegion(env),
    logLevel: get('LOG_LEVEL'),
    version: get('LUNE_VERSION'),
    magicSecret: get('MAGIC_SECRET'),
    tokenSignatureSecret: get('TOKEN_SIG_SECRET'),
    mongoUsername: get('MONGO_USER_NAME'),
    mongoPassword: get('MONGO_PASSWORD'),
    mongoInstanceName: get('MONGO_INSTANCE_NAME'),
    mongoSubdomain: get('MONGO_SUBDOMAIN'),
    builderApiUrl: get('BUILDER_API_URL'),
    githubClientSecret: get('GITHUB_CLIENT_SECRET'),
    githubPrivateKey: get('GITHUB_PRIVATE_KEY').replace(/\\n/g, '\n'),
    githubAppId: get('GITHUB_APP_ID'),
    githubClientId: get('GITHUB_CLIENT_ID'),
}

export type Config = typeof config

export default config