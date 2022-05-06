export type Collection = 'workspaces' 
    | 'users' 
    | 'logs' 
    | 'migrations'
    | 'registry'

export const COLLECTIONS: Record<Collection, true> = {
    logs: true,
    migrations: true,
    workspaces: true,
    users: true,
    registry: true
}

export const CURRENT_VERSIONS: Record<Collection, number> = {
    logs: 0,
    migrations: 0,
    workspaces: 0,
    users: 0,
    registry: 0
}