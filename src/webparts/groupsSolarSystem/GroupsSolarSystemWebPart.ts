import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version, Environment, EnvironmentType } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneChoiceGroup,
  PropertyPaneSlider,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'GroupsSolarSystemWebPartStrings';
import GroupsSolarSystem from './components/GroupsSolarSystem';
import { IGroupsSolarSystemProps } from './components/IGroupsSolarSystemProps';
import { GraphService } from '../../services/GraphService';
import { MockGraphService } from '../../services/MockGraphService';

export enum GroupFilterMode {
  All = 'All',
  SpecificIds = 'SpecificIds',
  UrlPrefix = 'UrlPrefix'
}

export interface IGroupsSolarSystemWebPartProps {
  description: string;
  userDisplayName: string;
  filterMode: 'All' | 'SpecificIds' | 'UrlPrefix';
  groupIds: string;
  urlPrefix: string;
  groupNodeSize: number;
  showUserLabel: boolean;
  animationMode: 'Orbit' | 'Static' | 'Alive';
  baseFontSize: number;
  animationSpeed: number;
  containerHeight: number;
  useCustomCenter: boolean;
  customCenterTitle: string;
  customCenterImageUrl: string;
  layoutMode: 'Solar' | 'Mesh';
  linkLineType: string;
  centerNodeSize: number;
  enableShadows: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundType: 'transparent' | 'color' | 'image';
  backgroundColor: string;
  backgroundImageUrl: string;
  fontColor: string;
  isNodeClickable: boolean;
  showMeetingCycle: boolean;
  meetingCyclePropertyName: string;
}

export default class GroupsSolarSystemWebPart extends BaseClientSideWebPart<IGroupsSolarSystemWebPartProps> {

  private _graphService: GraphService;
  private _mockGraphService: MockGraphService;

  public async onInit(): Promise<void> {
    // Determine which service to use
    if (Environment.type === EnvironmentType.Local || Environment.type === EnvironmentType.Test) {
      this._mockGraphService = new MockGraphService();
    } else {
      this._graphService = new GraphService(this.context.msGraphClientFactory);
    }
    return super.onInit();
  }

  public render(): void {
    // Parse Group IDs if present
    const ids = this.properties.groupIds
      ? this.properties.groupIds.split(',').map(s => s.trim()).filter(s => s)
      : [];

    // Choose service instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = this._mockGraphService || this._graphService;

    const element: React.ReactElement<IGroupsSolarSystemProps> = React.createElement(
      GroupsSolarSystem,
      {
        description: this.properties.description,
        userDisplayName: this.context.pageContext.user.displayName, // Use actual user name
        graphService: service,
        filterMode: this.properties.filterMode || 'All',
        groupIds: ids,
        urlPrefix: this.properties.urlPrefix,
        groupNodeSize: this.properties.groupNodeSize || 6,
        showUserLabel: this.properties.showUserLabel !== false, // Default true
        animationMode: this.properties.animationMode || 'Orbit', // Default Orbit
        baseFontSize: this.properties.baseFontSize || 14,
        animationSpeed: this.properties.animationSpeed || 0,
        containerHeight: this.properties.containerHeight || 600,
        useCustomCenter: this.properties.useCustomCenter,
        customCenterTitle: this.properties.customCenterTitle || 'Center',
        customCenterImageUrl: this.properties.customCenterImageUrl || '',
        layoutMode: this.properties.layoutMode || 'Solar',
        linkLineType: this.properties.linkLineType || 'dotted',
        centerNodeSize: this.properties.centerNodeSize || 20,
        enableShadows: this.properties.enableShadows !== false, // Default true
        shadowColor: this.properties.shadowColor || 'rgba(0,0,0,0.3)',
        shadowBlur: this.properties.shadowBlur || 10,
        shadowOffsetX: this.properties.shadowOffsetX || 3,
        shadowOffsetY: this.properties.shadowOffsetY || 3,
        backgroundType: this.properties.backgroundType || 'color',
        backgroundColor: this.properties.backgroundColor || '#ffffff',
        backgroundImageUrl: this.properties.backgroundImageUrl || '',
        fontColor: this.properties.fontColor || '#000000',
        isNodeClickable: this.properties.isNodeClickable !== false, // Default true if undefined
        showMeetingCycle: this.properties.showMeetingCycle,
        meetingCyclePropertyName: this.properties.meetingCyclePropertyName
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    // PAGE 1: Configuration & Content

    // Group 1: Data Source
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataSourceFields: any[] = [
      PropertyPaneTextField('description', {
        label: strings.DescriptionFieldLabel
      }),
      PropertyPaneChoiceGroup('filterMode', {
        label: 'Filter Mode',
        options: [
          { key: 'All', text: 'All Groups' },
          { key: 'SpecificIds', text: 'Specific Group IDs' },
          { key: 'UrlPrefix', text: 'URL Prefix' }
        ]
      })
    ];

    if (this.properties.filterMode === 'SpecificIds') {
      dataSourceFields.push(
        PropertyPaneTextField('groupIds', {
          label: 'Group IDs (comma separated)',
          multiline: true
        })
      );
    }
    if (this.properties.filterMode === 'UrlPrefix') {
      dataSourceFields.push(
        PropertyPaneTextField('urlPrefix', {
          label: 'URL Prefix'
        })
      );
    }

    // Group 2: Layout & Display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutDisplayFields: any[] = [
      PropertyPaneChoiceGroup('layoutMode', {
        label: 'Layout Mode',
        options: [
          { key: 'Solar', text: 'Solar System' },
          { key: 'Mesh', text: 'Mesh Network' }
        ]
      })
    ];

    // Only show animation settings for Solar mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupMetadataFields: any[] = [
      PropertyPaneToggle('showMeetingCycle', {
        label: 'Show Meeting Cycle (Tooltip)'
      })
    ];
    if (this.properties.showMeetingCycle) {
      groupMetadataFields.push(
        PropertyPaneTextField('meetingCyclePropertyName', {
          label: 'Extension Property Name',
          description: 'e.g. extension_appId_MeetingCycle'
        })
      );
    }

    if (this.properties.layoutMode === 'Solar') {
      layoutDisplayFields.push(
        PropertyPaneChoiceGroup('animationMode', {
          label: 'Animation Mode',
          options: [
            { key: 'Orbit', text: 'Orbit' },
            { key: 'Static', text: 'Static' },
            { key: 'Alive', text: 'Alive' }
          ]
        }),
        PropertyPaneSlider('animationSpeed', {
          label: 'Animation Speed (%)',
          min: -100,
          max: 100,
          step: 10,
          value: 0
        })
      );
    }

    // Container height applies to both modes
    layoutDisplayFields.push(
      PropertyPaneSlider('containerHeight', {
        label: 'Container Height (px)',
        min: 300,
        max: 1200,
        step: 50,
        value: 600
      }),
      PropertyPaneChoiceGroup('backgroundType', {
        label: 'Background Type',
        options: [
          { key: 'transparent', text: 'Transparent' },
          { key: 'color', text: 'Color' },
          { key: 'image', text: 'Image' }
        ]
      })
    );

    // Conditional background fields
    if (this.properties.backgroundType === 'color') {
      layoutDisplayFields.push(
        PropertyPaneTextField('backgroundColor', {
          label: 'Background Color (Hex/RGBA)',
          description: 'e.g., #ffffff or rgba(255,255,255,0.8)'
        })
      );
    } else if (this.properties.backgroundType === 'image') {
      layoutDisplayFields.push(
        PropertyPaneTextField('backgroundImageUrl', {
          label: 'Background Image URL',
          description: `Image will be centered/cover. Current size: ${this.domElement?.offsetWidth || 0} x ${this.properties.containerHeight}px`
        })
      );
    }


    // PAGE 2: Visual Customization

    // Group 3: Center Node (Solar mode specific)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const centerNodeFields: any[] = [
      PropertyPaneToggle('useCustomCenter', {
        label: 'Use Custom Center Node',
        checked: false
      }),
      PropertyPaneSlider('centerNodeSize', {
        label: 'Center Node Size',
        min: 10,
        max: 100,
        step: 5,
        value: 20
      }),
      PropertyPaneToggle('showUserLabel', {
        label: 'Show Center Label',
        checked: true
      })
    ];
    if (this.properties.useCustomCenter) {
      centerNodeFields.push(
        PropertyPaneTextField('customCenterTitle', {
          label: 'Custom Center Title'
        }),
        PropertyPaneTextField('customCenterImageUrl', {
          label: 'Custom Center Image URL'
        })
      );
    }

    // Group 4: Node Styling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeStylingFields: any[] = [
      PropertyPaneSlider('groupNodeSize', {
        label: 'Group Node Size',
        min: 2,
        max: 30,
        step: 1,
        value: 6
      }),
      PropertyPaneToggle('isNodeClickable', {
        label: 'Enable Node Click',
        checked: true
      }),
      PropertyPaneSlider('baseFontSize', {
        label: 'Base Font Size',
        min: 10,
        max: 30,
        step: 1,
        value: 14
      }),
      PropertyPaneTextField('fontColor', {
        label: 'Font Color (Hex)',
        description: 'e.g., #000000 for black, #ffffff for white'
      })
    ];

    // Group 5: Link Styling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkStylingFields: any[] = [
      PropertyPaneChoiceGroup('linkLineType', {
        label: 'Link Line Type',
        options: [
          { key: 'solid', text: 'Solid' },
          { key: 'dashed', text: 'Dashed' },
          { key: 'dotted', text: 'Dotted' }
        ]
      })
    ];

    // Group 6: Shadow Effects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shadowFields: any[] = [
      PropertyPaneToggle('enableShadows', {
        label: 'Enable Shadows'
      }),
      PropertyPaneTextField('shadowColor', {
        label: 'Shadow Color (Hex/RGBA)',
        disabled: !this.properties.enableShadows
      }),
      PropertyPaneSlider('shadowBlur', {
        label: 'Shadow Blur',
        min: 0,
        max: 50,
        step: 1,
        value: 10,
        disabled: !this.properties.enableShadows
      }),
      PropertyPaneSlider('shadowOffsetX', {
        label: 'Shadow Offset X',
        min: -20,
        max: 20,
        step: 1,
        value: 3,
        disabled: !this.properties.enableShadows
      }),
      PropertyPaneSlider('shadowOffsetY', {
        label: 'Shadow Offset Y',
        min: -20,
        max: 20,
        step: 1,
        value: 3,
        disabled: !this.properties.enableShadows
      })
    ];

    // Build pages array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: any[] = [
      {
        header: {
          description: 'Configure data source and layout settings'
        },
        groups: [
          {
            groupName: 'Data Source',
            groupFields: dataSourceFields
          },
          {
            groupName: 'Group Metadata',
            groupFields: groupMetadataFields
          },
          {
            groupName: 'Layout & Display',
            groupFields: layoutDisplayFields
          }
        ]
      }
    ];

    // Only add visual customization page for Solar mode (Mesh doesn't need Center Node)
    if (this.properties.layoutMode === 'Solar') {
      pages.push({
        header: {
          description: 'Customize visual appearance'
        },
        groups: [
          {
            groupName: 'Center Node',
            groupFields: centerNodeFields
          },
          {
            groupName: 'Node Styling',
            groupFields: nodeStylingFields
          },
          {
            groupName: 'Link Styling',
            groupFields: linkStylingFields
          },
          {
            groupName: 'Shadow Effects',
            groupFields: shadowFields
          }
        ]
      });
    } else {
      // For Mesh mode, show only styling options (no center node)
      pages.push({
        header: {
          description: 'Customize visual appearance'
        },
        groups: [
          {
            groupName: 'Node Styling',
            groupFields: nodeStylingFields
          },
          {
            groupName: 'Link Styling',
            groupFields: linkStylingFields
          },
          {
            groupName: 'Shadow Effects',
            groupFields: shadowFields
          }
        ]
      });
    }

    return {
      pages
    };
  }
}
