export interface IMember {
    id: string;
    displayName: string;
    photoBlobUrl?: string;
}

export interface IGroupNode {
    id: string;
    displayName: string;
    description?: string;
    mailNickname?: string;
    isUser?: boolean; // True if this node is the central user (Sun)
    photoBlobUrl?: string;
    members?: IMember[];
    owners?: IMember[];
    meetingCycle?: string;
    fx?: number;
    fy?: number;
}

export interface IGraphLink {
    source: string;
    target: string;
    value: number;
}

export interface IGraphData {
    nodes: IGroupNode[];
    links: IGraphLink[];
}

export interface IGraphService {
    getMyGroups(extraProperties?: string[]): Promise<IGroupNode[]>;
    getGroupsByIds(ids: string[], extraProperties?: string[]): Promise<IGroupNode[]>;
    getGroupsBySiteUrlPrefix(prefix: string, extraProperties?: string[]): Promise<IGroupNode[]>;
    getGroupMembers(groupId: string): Promise<IMember[]>;
    getGroupOwners(groupId: string): Promise<IMember[]>;
    getGroupSiteUrl(groupId: string): Promise<string>;
}
