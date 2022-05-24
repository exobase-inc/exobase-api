
const get = <T = string>(name: string, defaultValue: T = null, cast: (v: any) => T = (v) => v): T => {
    const val = process.env[name]
    if (!val) return defaultValue
    return cast(val)
}

const config = {
    env: get('EXOBASE_ENV'),
    logLevel: get('LOG_LEVEL'),
    tokenSignatureSecret: get('TOKEN_SIG_SECRET'),
    mongoUri: get('MONGO_URI'),
    builderApiUrl: get('BUILDER_API_URL'),
    builderApiKey: get('BUILDER_API_KEY'),
    githubClientSecret: get('GITHUB_CLIENT_SECRET'),
    githubPrivateKey: get('GITHUB_PRIVATE_KEY').replace(/\\n/g, '\n'),
    githubAppId: get('GITHUB_APP_ID'),
    githubClientId: get('GITHUB_CLIENT_ID'),
    s3UploadsAccessKeyId: get('S3_UPLOADS_ACCESS_KEY_ID'),
    s3UploadsAccessKey: get('S3_UPLOADS_ACCESS_KEY'),
    s3UploadsBucket: get('S3_UPLOADS_BUCKET')
}

export type Config = typeof config

export default config
