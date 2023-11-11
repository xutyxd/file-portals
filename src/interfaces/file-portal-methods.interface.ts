
export interface IFilePortalMethods {
    information(): Promise<{ name: string, type: 'server' | 'client' }>;
    shutdown(): Promise<void>;
}