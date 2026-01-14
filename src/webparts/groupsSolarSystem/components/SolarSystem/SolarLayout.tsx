import * as React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { IGraphData, IGroupNode, IMember } from '../../../../services/IGraphService';
import { renderCustomNode, renderNodeHitArea } from '../utils/nodeRenderer';
import { GroupTooltip } from './GroupTooltip';

const { useState } = React;

export interface ISolarLayoutProps {
    data: IGraphData;
    width: number;
    height: number;
    groupNodeSize: number;
    showUserLabel: boolean;
    animationMode: 'Orbit' | 'Static' | 'Alive';
    baseFontSize: number;
    animationSpeed: number;
    linkLineType?: string;
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
    isNodeClickable: boolean;

    onFetchMembers: (groupId: string) => Promise<IMember[]>;
    onGetSiteUrl: (groupId: string) => Promise<string>;

    // Callbacks
    onNodeHover: (node: IGroupNode | null) => void;
    onNodeClick: (node: IGroupNode) => void;
}

const SolarLayout: React.FC<ISolarLayoutProps> = (props) => {
    const fgRef = React.useRef<any>(null);
    const requestRef = React.useRef<number>();
    const isPausedRef = React.useRef<boolean>(false);

    const [hoveredNode, setHoveredNode] = useState<IGroupNode | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const frameRef = React.useRef<number>(0);

    // Filter data for Solar View (Keep everything, ensure separation)
    const processedData = React.useMemo(() => {
        if (!props.data || !props.data.nodes) return { nodes: [], links: [] };
        const nodes = props.data.nodes.map(n => ({ ...n }));
        const links = props.data.links.map(l => ({ ...l }));
        return { nodes, links };
    }, [props.data]);

    // Animation Loop
    React.useEffect(() => {
        if (!processedData.nodes.length) return;

        // Position Calculation
        const userSizeRadius = (props.centerNodeSize || 20);
        const effectiveNodeSize = props.groupNodeSize || 6;
        const innerBuffer = 80;
        const marginX = effectiveNodeSize + 100;
        const marginY = effectiveNodeSize + 80;

        const absoluteMaxRx = (props.width / 2) - marginX;
        const absoluteMaxRy = (props.height / 2) - marginY;
        let minRx = userSizeRadius + innerBuffer;
        let minRy = userSizeRadius + innerBuffer;
        if (minRx > absoluteMaxRx) minRx = Math.max(userSizeRadius + 20, absoluteMaxRx - 20);
        if (minRy > absoluteMaxRy) minRy = Math.max(userSizeRadius + 20, absoluteMaxRy - 20);
        const maxRx = Math.max(minRx, absoluteMaxRx * 0.9);
        const maxRy = Math.max(minRy, absoluteMaxRy * 0.9);

        const groupNodes = processedData.nodes.filter((n: any) => !n.isUser);
        const userNode = processedData.nodes.filter((n: any) => n.isUser)[0];

        if (userNode) {
            userNode.fx = 0;
            userNode.fy = 0;
        }

        const nodeCount = groupNodes.length;
        if (nodeCount > 0) {
            groupNodes.forEach((node: any, i: number) => {
                const t = nodeCount > 1 ? i / (nodeCount - 1) : 0.0;
                if (typeof node.orbitAngle === 'undefined') {
                    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                    node.orbitAngle = i * goldenAngle;
                }

                if (props.animationMode === 'Orbit') {
                    node.rx = minRx + (maxRx - minRx) * t;
                    node.ry = minRy + (maxRy - minRy) * t;
                    const direction = i % 2 === 0 ? 1 : -1;
                    node.orbitSpeed = (0.0003 + (1 - t) * 0.0005) * direction;
                } else {
                    const rNorm = Math.sqrt(i + 1) / Math.sqrt(nodeCount);
                    const rx = minRx + (maxRx - minRx) * rNorm;
                    const ry = minRy + (maxRy - minRy) * rNorm;
                    node.staticX = Math.cos(node.orbitAngle) * rx;
                    node.staticY = Math.sin(node.orbitAngle) * ry;
                    node.fx = node.staticX;
                    node.fy = node.staticY;
                }
            });
        }

        const animate = () => {
            if (props.animationMode === 'Static') {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                return;
            }
            if (!isPausedRef.current) {
                frameRef.current++;
                const speedMultiplier = 1 + (props.animationSpeed || 0) / 100;

                groupNodes.forEach((node: any, i: number) => {
                    if (props.animationMode === 'Orbit') {
                        node.orbitAngle += node.orbitSpeed * speedMultiplier;
                        node.fx = Math.cos(node.orbitAngle) * node.rx;
                        node.fy = Math.sin(node.orbitAngle) * node.ry;
                    }
                    else if (props.animationMode === 'Alive') {
                        const wobbleSpeed = 0.02 * speedMultiplier;
                        const wobbleDist = 3;
                        const offsetX = Math.sin(frameRef.current * wobbleSpeed + i) * wobbleDist;
                        const offsetY = Math.cos(frameRef.current * wobbleSpeed * 0.8 + i) * wobbleDist;
                        node.fx = node.staticX + offsetX;
                        node.fy = node.staticY + offsetY;
                    }
                });
            }
            requestRef.current = requestAnimationFrame(animate);
        };

        if (props.animationMode !== 'Static') {
            requestRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [processedData, props.width, props.height, props.animationMode, props.animationSpeed, props.centerNodeSize, props.groupNodeSize]);

    // Force Engine Config (Manual Mode)
    React.useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('charge').strength(0);
            fgRef.current.d3Force('link').strength(0);
            fgRef.current.d3Force('center').strength(0);

            // Auto fit once
            setTimeout(() => {
                if (fgRef.current) fgRef.current.zoomToFit(400, 50);
            }, 250);
            // Keep Alive manual Loop
            fgRef.current.d3ReheatSimulation();
        }
    }, [props.width, props.height]); // Re-run on resize

    // Shared Node Render Pass-through
    const customNodeCanvas = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        renderCustomNode(node, ctx, globalScale, {
            centerNodeSize: props.centerNodeSize,
            groupNodeSize: props.groupNodeSize,
            baseFontSize: props.baseFontSize,
            fontColor: props.fontColor,
            showUserLabel: props.showUserLabel,
            enableShadows: props.enableShadows,
            shadowColor: props.shadowColor,
            shadowBlur: props.shadowBlur,
            shadowOffsetX: props.shadowOffsetX,
            shadowOffsetY: props.shadowOffsetY,
            fixedScreenSize: true
        });
    };

    const customNodeHitArea = (node: any, color: string, ctx: CanvasRenderingContext2D) => {
        const currentZoom = fgRef.current ? fgRef.current.zoom() : 1;
        renderNodeHitArea(node, color, ctx, currentZoom, {
            centerNodeSize: props.centerNodeSize,
            groupNodeSize: props.groupNodeSize,
            fixedScreenSize: true
        });
    };

    const getLinkLineDash = (): number[] | null => {
        switch (props.linkLineType) {
            case 'dashed': return [10, 5];
            case 'dotted': return [4, 4];
            case 'solid': return [];
            case 'none': return [];
            default: return [4, 4];
        }
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        setMousePos({ x: event.clientX, y: event.clientY });
    };

    const handleNodeHover = (node: any) => {
        isPausedRef.current = !!node;
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
                    d3AlphaDecay={0}
                    d3VelocityDecay={0}
                    // Interaction
                    enableZoomInteraction={false}
                    enablePanInteraction={false}
                    // @ts-ignore
                    d3AlphaTarget={0.1} // Manual Mode Needs Target
                    onEngineStop={() => {
                        if (fgRef.current) fgRef.current.d3ReheatSimulation();
                    }}
                    onNodeHover={handleNodeHover}
                    onNodeClick={props.isNodeClickable ? (node) => props.onNodeClick(node as IGroupNode) : undefined}
                />
            </div>
            {hoveredNode && !hoveredNode.isUser && (
                <GroupTooltip node={hoveredNode} x={mousePos.x} y={mousePos.y} />
            )}
        </>
    );
};

export default SolarLayout;
