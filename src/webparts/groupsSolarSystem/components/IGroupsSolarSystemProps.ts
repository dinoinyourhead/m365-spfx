export interface IGroupsSolarSystemProps {
  description: string;
  userDisplayName: string;
  graphService: any; // Using any to accept both Mock and Real service
  filterMode: 'All' | 'SpecificIds' | 'UrlPrefix';
  groupIds: string[];
  urlPrefix?: string;
  groupNodeSize: number;
  showUserLabel: boolean; // Renamed from showUserNode to reflect new behavior
  animationMode: 'Orbit' | 'Static' | 'Alive';
  baseFontSize: number;
  animationSpeed: number;
  containerHeight: number;
  useCustomCenter: boolean;
  customCenterTitle: string;
  customCenterImageUrl: string;
  layoutMode: 'Solar' | 'Mesh';
  linkLineType?: string; // 'solid', 'dashed', 'dotted', 'none'
  centerNodeSize: number;
  // Shadows
  enableShadows: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundType: 'transparent' | 'color' | 'image';
  backgroundColor: string;
  backgroundImageUrl: string;
  fontColor: string;
}
