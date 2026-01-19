import * as React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { IGraphData, IGroupNode, IMember } from '../../../../services/IGraphService';
import { renderCustomNode, renderNodeHitArea } from '../utils/nodeRenderer';
import { GroupTooltip } from './GroupTooltip';

const { useState } = React;

export interface IMeshLayoutProps {
    data: IGraphData;
    width: number;
    height: number;
    groupNodeSize: number;
    baseFontSize: number;
    linkLineType: 'solid' | 'dashed' | 'dotted';
    // Shadows
    enableShadows: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    backgroundType: 'transparent' | 'color' | 'image';
    backgroundColor: string;
    backgroundImageUrl: string;
    fontColor: string;
    isNodeClickable: boolean;

    onFetchMembers: (groupId: string) => Promise<IMember[]>;
    onGetSiteUrl: (groupId: string) => Promise<string>;

    // Callbacks
    // eslint-disable-next-line @rushstack/no-new-null
    onNodeHover: (node: IGroupNode | null) => void;
    onNodeClick: (node: IGroupNode) => void;
}

const MeshLayout: React.FC<IMeshLayoutProps> = (props) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = React.useRef<any>(null);

    // eslint-disable-next-line @rushstack/no-new-null
    const [hoveredNode, setHoveredNode] = useState<IGroupNode | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Process Data: Remove User Node, Generate Mesh Links
    const processedData = React.useMemo(() => {
        if (!props.data || !props.data.nodes) return { nodes: [], links: [] };

        // 1. Filter out User Node
        const nodes = props.data.nodes
            .filter(n => !n.isUser)
            .map(n => ({ ...n, fx: undefined, fy: undefined })); // Ensure no fixed positions

        // 2. Generate Links (Ring Lattice / Small World)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const links: any[] = [];
        const k = 2; // Connect to 2 nearest neighbors

        // Sort to ensure deterministic linking (e.g. alphabetical or ID)
        nodes.sort((a, b) => a.id.localeCompare(b.id));

        const len = nodes.length;
        if (len > 1) {
            for (let i = 0; i < len; i++) {
                // Connect to next k nodes (wrapping)
                for (let j = 1; j <= k; j++) {
                    const targetIndex = (i + j) % len;
                    // Avoid self-loops (shouldn't happen with j>=1)
                    if (targetIndex !== i) {
                        links.push({
                            source: nodes[i].id,
                            target: nodes[targetIndex].id
                        });
                    }
                }
            }
        }
        return { nodes, links };
    }, [props.data]);

    // Force Config
    React.useEffect(() => {
        if (fgRef.current) {
            // Standard Physics
            // Charge: Repel (Stronger to use more space)
            fgRef.current.d3Force('charge').strength(-1500);
            // Link: Distance (Longer to spread out)
            fgRef.current.d3Force('link').strength(0.2).distance(250);
            // Center: Weakly pull to screen center
            fgRef.current.d3Force('center').strength(0.01);

            // Let it hot start
            fgRef.current.d3ReheatSimulation();

            // Initial Zoom Fit
            setTimeout(() => {
                if (fgRef.current) fgRef.current.zoomToFit(400, 50);
            }, 500);
        }
    }, [processedData]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
    const customNodeCanvas = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        renderCustomNode(node, ctx, globalScale, {
            centerNodeSize: 0,
            groupNodeSize: props.groupNodeSize,
            baseFontSize: props.baseFontSize,
            fontColor: props.fontColor,
            showUserLabel: false,
            fixedScreenSize: true,
            enableShadows: props.enableShadows,
            shadowColor: props.shadowColor || 'rgba(0,0,0,0.3)',
            shadowBlur: props.shadowBlur || 10,
            shadowOffsetX: props.shadowOffsetX || 3,
            shadowOffsetY: props.shadowOffsetY || 3
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
    const customNodeHitArea = (node: any, color: string, ctx: CanvasRenderingContext2D) => {
        const currentZoom = fgRef.current ? fgRef.current.zoom() : 1;
        renderNodeHitArea(node, color, ctx, currentZoom, {
            centerNodeSize: 0,
            groupNodeSize: props.groupNodeSize,
            fixedScreenSize: true
        });
    };

    // Link Line Style
    const getLinkLineDash = (): number[] | null => {
        switch (props.linkLineType) {
            case 'dashed': return [5, 5];
            case 'dotted': return [2, 2];
            case 'solid':
            default: return null;
        }
    };

    const handleMouseMove = (event: React.MouseEvent): void => {
        setMousePos({ x: event.clientX, y: event.clientY });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNodeHover = (node: any): void => {
        setHoveredNode(node);
        props.onNodeHover(node as IGroupNode);
    };

    // Determine background based on type
    const getBackgroundStyle = (): React.CSSProperties => {
        if (props.backgroundType === 'image' && props.backgroundImageUrl) {
            return {
                backgroundImage: `url(${props.backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }
        return {};
    };

    const getBackgroundColor = (): string => {
        if (props.backgroundType === 'transparent') {
            return 'transparent';
        } else if (props.backgroundType === 'color') {
            return props.backgroundColor || '#ffffff';
        }
        // For image type, use transparent so image shows through
        return 'transparent';
    };

    const getLinkColor = (): string => {
        // Adaptive link color based on background
        if (props.backgroundType === 'color') {
            const color = props.backgroundColor || '#ffffff';
            // Simple luminance check - if dark background, use light links
            if (color.toLowerCase().indexOf('000') !== -1 || color.toLowerCase().indexOf('rgb(0') !== -1) {
                return '#cccccc'; // Light gray for dark backgrounds
            }
        }
        return '#d0d0d0'; // Light gray for light backgrounds (subtle)
    };

    return (
        <>
            <div
                onMouseMove={handleMouseMove}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    cursor: (hoveredNode && !hoveredNode.isUser && props.isNodeClickable) ? 'pointer' : 'default',
                    ...getBackgroundStyle()
                }}
            >
                <ForceGraph2D
                    ref={fgRef}
                    width={props.width}
                    height={props.height}
                    graphData={processedData}
                    nodeCanvasObject={customNodeCanvas}
                    nodePointerAreaPaint={customNodeHitArea}
                    nodeLabel={() => ''}
                    linkDirectionalArrowLength={0}
                    linkLineDash={getLinkLineDash()}
                    linkWidth={0.5}
                    linkColor={() => getLinkColor()}
                    backgroundColor={getBackgroundColor()}
                    // Standard Physics
                    d3AlphaDecay={0.0228}
                    d3VelocityDecay={0.4}
                    // Interaction
                    enableZoomInteraction={false}
                    enablePanInteraction={false}
                    onNodeHover={handleNodeHover}
                    onNodeClick={props.isNodeClickable ? (node) => props.onNodeClick(node as IGroupNode) : undefined}
                />
            </div>
            {hoveredNode && (
                <GroupTooltip node={hoveredNode} x={mousePos.x} y={mousePos.y} />
            )}
        </>
    );
};

export default MeshLayout;
