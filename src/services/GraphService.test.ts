/// <reference types="jest" />

import { GraphService } from './GraphService';
import { MSGraphClientFactory, MSGraphClientV3 } from '@microsoft/sp-http';
// Removed unused imports

describe('GraphService', () => {
    let graphService: GraphService;
    let mockClientFactory: MSGraphClientFactory;
    let mockClient: MSGraphClientV3;

    beforeEach(() => {
        // Mock MSGraphClientV3
        mockClient = {
            api: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            top: jest.fn().mockReturnThis(),
            filter: jest.fn().mockReturnThis(),
            responseType: jest.fn().mockReturnThis(),
            get: jest.fn()
        } as unknown as MSGraphClientV3;

        // Mock MSGraphClientFactory
        mockClientFactory = {
            getClient: jest.fn().mockResolvedValue(mockClient)
        } as unknown as MSGraphClientFactory;

        graphService = new GraphService(mockClientFactory);
    });

    it('should fetch my groups correctly', async () => {
        const mockGroupsResponse = {
            value: [
                { id: '1', displayName: 'Group 1', description: 'Desc 1', mailNickname: 'group1' },
                { id: '2', displayName: 'Group 2', description: 'Desc 2', mailNickname: 'group2' }
            ]
        };

        (mockClient.api as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            top: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockGroupsResponse)
        });

        // Mock photo fetching failure to avoid complex mocking of blob
        const clientWithPhotoFail = {
           ...mockClient,
           api: jest.fn((url: string) => {
               if (url.indexOf('/photo/$value') !== -1) {
                   return {
                       responseType: jest.fn().mockReturnThis(),
                       get: jest.fn().mockRejectedValue(new Error('No photo'))
                   };
               }
               return {
                   select: jest.fn().mockReturnThis(),
                   top: jest.fn().mockReturnThis(),
                   get: jest.fn().mockResolvedValue(mockGroupsResponse)
               }
           })
        } as unknown as MSGraphClientV3;
        (mockClientFactory.getClient as jest.Mock).mockResolvedValue(clientWithPhotoFail);

        const groups = await graphService.getMyGroups();

        expect(groups).toHaveLength(2);
        expect(groups[0].id).toBe('1');
        expect(groups[0].displayName).toBe('Group 1');
    });

    it('should fetch group members correctly', async () => {
        const mockMembersResponse = {
            value: [
                { id: 'u1', displayName: 'User 1' },
                { id: 'u2', displayName: 'User 2' }
            ]
        };

        (mockClient.api as jest.Mock).mockImplementation((url: string) => {
             if (url.indexOf('/members') !== -1) {
                 return {
                    top: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue(mockMembersResponse)
                 };
             }
             if (url.indexOf('/photo/$value') !== -1) {
                 return {
                     responseType: jest.fn().mockReturnThis(),
                     get: jest.fn().mockRejectedValue(new Error('No photo'))
                 };
             }
             return { get: jest.fn() };
        });

        const members = await graphService.getGroupMembers('g1');

        expect(members).toHaveLength(2);
        expect(members[0].id).toBe('u1');
        expect(members[0].displayName).toBe('User 1');
    });

    it('should handle errors gracefully when fetching groups', async () => {
        (mockClientFactory.getClient as jest.Mock).mockRejectedValue(new Error('Graph error'));

        const groups = await graphService.getMyGroups();

        expect(groups).toEqual([]);
    });
});
