import { IGraphService, IGroupNode } from './IGraphService';

export class MockGraphService implements IGraphService {
    public getMyGroups(): Promise<IGroupNode[]> {
        return new Promise<IGroupNode[]>((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: '1', displayName: 'Mock Group 1', description: 'Mock Description 1', isUser: false },
                    { id: '2', displayName: 'Mock Group 2', description: 'Mock Description 2', isUser: false },
                    { id: '3', displayName: 'Engineering', description: 'Engineering team', isUser: false },
                    { id: '4', displayName: 'Sales', description: 'Sales team', isUser: false },
                    { id: '5', displayName: 'Marketing', description: 'Marketing team', isUser: false },
                ]);
            }, 500);
        });
    }

    public getGroupsByIds(ids: string[]): Promise<IGroupNode[]> {
        return new Promise<IGroupNode[]>((resolve) => {
            resolve([
                { id: '100', displayName: 'Specific Mock Group', description: 'Loaded by ID', isUser: false },
                { id: '101', displayName: 'Another Mock Group', description: 'Loaded by ID', isUser: false }
            ]);
        });
    }

    public getGroupsBySiteUrlPrefix(prefix: string): Promise<IGroupNode[]> {
        return new Promise<IGroupNode[]>((resolve) => {
            resolve([
                { id: '200', displayName: `Prefix Group ${prefix} 1`, description: 'Loaded by Prefix', isUser: false },
                { id: '201', displayName: `Prefix Group ${prefix} 2`, description: 'Loaded by Prefix', isUser: false }
            ]);
        });
    }

    public getGroupMembers(groupId: string): Promise<any[]> {
        return Promise.resolve([]);
    }

    public getGroupSiteUrl(groupId: string): Promise<string> {
        return Promise.resolve('https://www.google.com/search?q=sharepoint+' + groupId);
    }
}
