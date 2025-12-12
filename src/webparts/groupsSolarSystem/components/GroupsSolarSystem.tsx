import * as React from 'react';
import styles from './GroupsSolarSystem.module.scss';
import type { IGroupsSolarSystemProps } from './IGroupsSolarSystemProps';
import { IGraphData, IGroupNode, IMember } from '../../../services/IGraphService';
import SolarLayout from './SolarSystem/SolarLayout';
import MeshLayout from './SolarSystem/MeshLayout';

export interface IGroupsSolarSystemState {
  graphData: IGraphData;
  loading: boolean;
  error?: string;
  width: number;
  height: number;
}

const FilterModes = {
  SPECIFIC_IDS: 'SpecificIds',
  URL_PREFIX: 'UrlPrefix'
};

export default class GroupsSolarSystem extends React.Component<IGroupsSolarSystemProps, IGroupsSolarSystemState> {
  private _containerRef = React.createRef<HTMLDivElement>();
  private _resizeObserver: ResizeObserver;

  constructor(props: IGroupsSolarSystemProps) {
    super(props);
    this.state = {
      graphData: { nodes: [], links: [] },
      loading: true,
      width: 800,
      height: 600
    };
  }

  public componentDidMount(): void {
    this._fetchData().catch((err) => { console.error(err); });

    if (this._containerRef.current) {
      this.setState({
        width: this._containerRef.current.clientWidth
      });

      this._resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          // Only track width to avoid infinite height loop
          if (entry.contentRect.width !== this.state.width) {
            this.setState({
              width: entry.contentRect.width
            });
          }
        }
      });
      this._resizeObserver.observe(this._containerRef.current);
    }
  }

  public componentWillUnmount(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  public componentDidUpdate(prevProps: IGroupsSolarSystemProps): void {
    if (prevProps.filterMode !== this.props.filterMode ||
      prevProps.groupIds !== this.props.groupIds ||
      prevProps.urlPrefix !== this.props.urlPrefix ||
      prevProps.userDisplayName !== this.props.userDisplayName ||
      prevProps.useCustomCenter !== this.props.useCustomCenter ||
      prevProps.customCenterTitle !== this.props.customCenterTitle ||
      prevProps.customCenterImageUrl !== this.props.customCenterImageUrl) {
      this._fetchData().catch((err) => { console.error(err); });
    }
  }

  private async _fetchData(): Promise<void> {
    this.setState({ loading: true, error: undefined });
    try {
      let groups: IGroupNode[];

      // Check filter mode
      if (this.props.filterMode === FilterModes.SPECIFIC_IDS) {
        groups = await this.props.graphService.getGroupsByIds(this.props.groupIds);
      } else if (this.props.filterMode === FilterModes.URL_PREFIX && this.props.urlPrefix) {
        groups = await this.props.graphService.getGroupsBySiteUrlPrefix(this.props.urlPrefix);
      } else {
        // Default to All / My Groups
        groups = await this.props.graphService.getMyGroups();
      }

      // Fetch members for each group to populate tooltips
      const groupsWithMembers = await Promise.all(
        groups.map(async (group) => {
          try {
            const members = await this.props.graphService.getGroupMembers(group.id);
            return { ...group, members };
          } catch (error) {
            console.error(`Failed to fetch members for group ${group.id}:`, error);
            return group; // Return group without members if fetch fails
          }
        })
      );

      const userNode: IGroupNode = {
        id: 'me',
        displayName: this.props.useCustomCenter
          ? (this.props.customCenterTitle || 'Center')
          : (this.props.userDisplayName || 'Me'),
        isUser: true,
        photoBlobUrl: this.props.useCustomCenter
          ? this.props.customCenterImageUrl
          : undefined,
        fx: 0,
        fy: 0
      };

      const nodes: IGroupNode[] = [userNode, ...groupsWithMembers];
      const links = groupsWithMembers.map(g => ({
        source: 'me',
        target: g.id,
        value: 1
      }));

      this.setState({
        graphData: { nodes, links },
        loading: false
      });
    } catch (err) {
      console.error(err);
      this.setState({ loading: false, error: 'Failed to load groups.' });
    }
  }

  private onFetchMembers = (groupId: string): Promise<IMember[]> => {
    return this.props.graphService.getGroupMembers(groupId);
  }

  private onGetSiteUrl = (groupId: string): Promise<string> => {
    return this.props.graphService.getGroupSiteUrl(groupId);
  }

  private handleNodeHover = (node: IGroupNode): void => {
    // Placeholder
  }

  private handleNodeClick = async (node: IGroupNode): Promise<void> => {
    if (node.isUser) return;
    try {
      const url = await this.props.graphService.getGroupSiteUrl(node.id);
      if (url) window.open(url, '_blank');
    } catch (e) {
      console.error('Error opening site:', e);
    }
  }

  public render(): React.ReactElement<IGroupsSolarSystemProps> {
    const { loading, error, graphData, width } = this.state;
    const height = this.props.containerHeight || 600;

    // Props destructuring
    const {
      groupNodeSize,
      showUserLabel,
      animationMode,
      layoutMode,
      baseFontSize,
      animationSpeed,
      centerNodeSize
    } = this.props;

    return (
      <section className={styles.groupsSolarSystem}>
        <div ref={this._containerRef} style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
          {loading && <div>Loading your solar system...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {!loading && !error && (
            layoutMode === 'Mesh' ? (
              <MeshLayout
                data={graphData}
                width={width}
                height={height}
                groupNodeSize={groupNodeSize}
                baseFontSize={baseFontSize}
                linkLineType={(this.props.linkLineType || 'solid') as 'solid' | 'dashed' | 'dotted'}
                enableShadows={this.props.enableShadows}
                shadowColor={this.props.shadowColor}
                shadowBlur={this.props.shadowBlur}
                shadowOffsetX={this.props.shadowOffsetX}
                shadowOffsetY={this.props.shadowOffsetY}
                backgroundType={this.props.backgroundType}
                backgroundColor={this.props.backgroundColor}
                backgroundImageUrl={this.props.backgroundImageUrl}
                fontColor={this.props.fontColor}
                onFetchMembers={(gid) => this.onFetchMembers(gid)}
                onGetSiteUrl={(gid) => this.onGetSiteUrl(gid)}
                onNodeHover={(n) => n && this.handleNodeHover(n)}
                onNodeClick={(n) => n && this.handleNodeClick(n)}
              />
            ) : (
              <SolarLayout
                data={graphData}
                width={width}
                height={height}
                groupNodeSize={groupNodeSize}
                baseFontSize={baseFontSize}
                animationMode={animationMode}
                animationSpeed={animationSpeed}
                centerNodeSize={centerNodeSize}
                showUserLabel={showUserLabel}
                linkLineType={this.props.linkLineType}
                enableShadows={this.props.enableShadows}
                shadowColor={this.props.shadowColor}
                shadowBlur={this.props.shadowBlur}
                shadowOffsetX={this.props.shadowOffsetX}
                shadowOffsetY={this.props.shadowOffsetY}
                backgroundType={this.props.backgroundType}
                backgroundColor={this.props.backgroundColor}
                backgroundImageUrl={this.props.backgroundImageUrl}
                fontColor={this.props.fontColor}
                onFetchMembers={(gid) => this.onFetchMembers(gid)}
                onGetSiteUrl={(gid) => this.onGetSiteUrl(gid)}
                onNodeHover={(n) => n && this.handleNodeHover(n)}
                onNodeClick={(n) => n && this.handleNodeClick(n)}
              />
            )
          )}
        </div>
      </section>
    );
  }
}
