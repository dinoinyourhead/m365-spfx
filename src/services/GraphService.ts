import { MSGraphClientFactory, MSGraphClientV3 } from '@microsoft/sp-http';
import { IGraphService, IGroupNode, IMember } from './IGraphService';

const API_ENDPOINTS = {
    MY_GROUPS: '/me/transitiveMemberOf/microsoft.graph.group',
    GROUPS: '/groups',
    USERS: '/users'
};

export class GraphService implements IGraphService {
    constructor(private _msGraphClientFactory: MSGraphClientFactory) { }

    private async getClient(): Promise<MSGraphClientV3> {
        return await this._msGraphClientFactory.getClient('3');
    }

    public async getMyGroups(): Promise<IGroupNode[]> {
        try {
            const client = await this.getClient();
            const response = await client.api(API_ENDPOINTS.MY_GROUPS)
                .select('id,displayName,mailNickname,description')
                .top(999)
                .get();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const groups: IGroupNode[] = response.value.map((g: any) => ({
                id: g.id,
                displayName: g.displayName,
                description: g.description,
                mailNickname: g.mailNickname
            }));
            await this.enrichEntitiesWithPhotos(groups, client, 'group');
            return groups;
        } catch (error) {
            console.error("Error fetching my groups", error);
            return [];
        }
    }

    public async getGroupsByIds(ids: string[]): Promise<IGroupNode[]> {
        try {
            const client = await this.getClient();
            const groups: IGroupNode[] = [];
            await Promise.all(ids.map(async (id) => {
                try {
                    const response = await client.api(`${API_ENDPOINTS.GROUPS}/${id}`).select('id,displayName,mailNickname,description').get();
                    groups.push({
                        id: response.id,
                        displayName: response.displayName,
                        description: response.description,
                        mailNickname: response.mailNickname
                    });
                } catch (e) {
                    console.warn(`Group ${id} not found`);
                }
            }));
            await this.enrichEntitiesWithPhotos(groups, client, 'group');
            return groups;
        } catch (error) {
            console.error("Error fetching groups by ids", error);
            return [];
        }
    }

    public async getGroupsBySiteUrlPrefix(prefix: string): Promise<IGroupNode[]> {
        try {
            const client = await this.getClient();
            const response = await client.api(API_ENDPOINTS.GROUPS)
                .filter(`startsWith(mailNickname, '${prefix}')`)
                .select('id,displayName,mailNickname,description')
                .top(999)
                .get();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const groups: IGroupNode[] = response.value.map((g: any) => ({
                id: g.id,
                displayName: g.displayName,
                description: g.description,
                mailNickname: g.mailNickname
            }));
            await this.enrichEntitiesWithPhotos(groups, client, 'group');
            return groups;
        } catch (e) {
            console.error("Error fetching groups by prefix", e);
            return [];
        }
    }

    public async getGroupMembers(groupId: string): Promise<IMember[]> {
        try {
            const client = await this.getClient();
            const membersResponse = await client.api(`${API_ENDPOINTS.GROUPS}/${groupId}/members`)
                .top(5)
                .select('id,displayName')
                .get();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const members: IMember[] = membersResponse.value.map((m: any) => ({
                id: m.id,
                displayName: m.displayName
            }));

            await this.enrichEntitiesWithPhotos(members, client, 'user');

            return members;
        } catch (error) {
            console.error(`Error fetching members for group ${groupId}`, error);
            return [];
        }
    }

    public async getGroupSiteUrl(groupId: string): Promise<string> {
        try {
            const client = await this.getClient();
            const response = await client.api(`${API_ENDPOINTS.GROUPS}/${groupId}/sites/root`).select('webUrl').get();
            return response.webUrl;
        } catch (error) {
            console.warn(`Error fetching site URL for group ${groupId}`, error);
            return '';
        }
    }

    private async enrichEntitiesWithPhotos(entities: { id: string, photoBlobUrl?: string }[], client: MSGraphClientV3, type: 'group' | 'user'): Promise<void> {
        await Promise.all(entities.map(async (entity) => {
            try {
                const endpoint = type === 'group'
                    ? `${API_ENDPOINTS.GROUPS}/${entity.id}/photo/$value`
                    : `${API_ENDPOINTS.USERS}/${entity.id}/photo/$value`;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const photoBlob = await client.api(endpoint).responseType('blob' as any).get();
                entity.photoBlobUrl = URL.createObjectURL(photoBlob);
            } catch (e) {
                // No photo or error, ignore
            }
        }));
    }
}
