import { MSGraphClientFactory, MSGraphClientV3 } from '@microsoft/sp-http';
import { IGraphService, IGroupNode, IMember } from './IGraphService';

export class GraphService implements IGraphService {
    constructor(private _msGraphClientFactory: MSGraphClientFactory) { }

    private async getClient(): Promise<MSGraphClientV3> {
        return await this._msGraphClientFactory.getClient('3');
    }

    public async getMyGroups(): Promise<IGroupNode[]> {
        const client = await this.getClient();
        try {
            const response = await client.api('/me/transitiveMemberOf/microsoft.graph.group')
                .select('id,displayName,mailNickname,description')
                .top(999)
                .get();
            const groups: IGroupNode[] = response.value.map((g: any) => ({
                id: g.id,
                displayName: g.displayName,
                description: g.description,
                mailNickname: g.mailNickname
            }));
            await this.enrichGroupsWithPhotos(groups, client);
            return groups;
        } catch (error) {
            console.error("Error fetching my groups", error);
            return [];
        }
    }

    public async getGroupsByIds(ids: string[]): Promise<IGroupNode[]> {
        const client = await this.getClient();
        const groups: IGroupNode[] = [];
        await Promise.all(ids.map(async (id) => {
            try {
                const response = await client.api(`/groups/${id}`).select('id,displayName,mailNickname,description').get();
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
        await this.enrichGroupsWithPhotos(groups, client);
        return groups;
    }

    public async getGroupsBySiteUrlPrefix(prefix: string): Promise<IGroupNode[]> {
        const client = await this.getClient();
        try {
            const response = await client.api('/groups')
                .filter(`startsWith(mailNickname, '${prefix}')`)
                .select('id,displayName,mailNickname,description')
                .top(999)
                .get();
            const groups: IGroupNode[] = response.value.map((g: any) => ({
                id: g.id,
                displayName: g.displayName,
                description: g.description,
                mailNickname: g.mailNickname
            }));
            await this.enrichGroupsWithPhotos(groups, client);
            return groups;
        } catch (e) {
            console.error("Error fetching groups by prefix", e);
            return [];
        }
    }

    public async getGroupMembers(groupId: string): Promise<IMember[]> {
        const client = await this.getClient();
        try {
            const membersResponse = await client.api(`/groups/${groupId}/members`)
                .top(5)
                .select('id,displayName')
                .get();

            const members: IMember[] = membersResponse.value.map((m: any) => ({
                id: m.id,
                displayName: m.displayName
            }));

            await Promise.all(members.map(async (member) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const photoBlob = await client.api(`/users/${member.id}/photo/$value`).responseType('blob' as any).get();
                    member.photoBlobUrl = URL.createObjectURL(photoBlob);
                } catch (e) {
                    // No photo
                }
            }));

            return members;
        } catch (error) {
            console.error(`Error fetching members for group ${groupId}`, error);
            return [];
        }
    }

    public async getGroupOwners(groupId: string): Promise<IMember[]> {
        const client = await this.getClient();
        try {
            const ownersResponse = await client.api(`/groups/${groupId}/owners`)
                .top(5)
                .select('id,displayName')
                .get();

            const owners: IMember[] = ownersResponse.value.map((m: any) => ({
                id: m.id,
                displayName: m.displayName
            }));

            await Promise.all(owners.map(async (owner) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const photoBlob = await client.api(`/users/${owner.id}/photo/$value`).responseType('blob' as any).get();
                    owner.photoBlobUrl = URL.createObjectURL(photoBlob);
                } catch (e) {
                    // No photo
                }
            }));

            return owners;
        } catch (error) {
            console.error(`Error fetching owners for group ${groupId}`, error);
            return [];
        }
    }

    public async getGroupSiteUrl(groupId: string): Promise<string> {
        const client = await this.getClient();
        try {
            const response = await client.api(`/groups/${groupId}/sites/root`).select('webUrl').get();
            return response.webUrl;
        } catch (error) {
            console.warn(`Error fetching site URL for group ${groupId}`, error);
            return '';
        }
    }

    private async enrichGroupsWithPhotos(groups: IGroupNode[], client: MSGraphClientV3): Promise<void> {
        await Promise.all(groups.map(async (group) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const photoBlob = await client.api(`/groups/${group.id}/photo/$value`).responseType('blob' as any).get();
                group.photoBlobUrl = URL.createObjectURL(photoBlob);
            } catch (e) {
                // No photo or error, ignore
            }
        }));
    }
}
