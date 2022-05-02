export type Collection = 'platforms' 
    | 'membership' 
    | 'users' 
    | 'deployments' 
    | 'repository_lookup'
    | 'migrations'
    | 'registry'

export const COLLECTIONS: Record<Collection, true> = {
    deployments: true,
    membership: true,
    migrations: true,
    platforms: true,
    repository_lookup: true,
    users: true,
    registry: true
}

export const CURRENT_VERSIONS: Record<Collection, number> = {
    deployments: 0,
    membership: 0,
    migrations: 0,
    platforms: 1,
    repository_lookup: 0,
    users: 0,
    registry: 0
}