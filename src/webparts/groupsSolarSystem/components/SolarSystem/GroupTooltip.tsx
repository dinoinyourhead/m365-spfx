import * as React from 'react';
import styles from './GroupTooltip.module.scss';
import { IGroupNode } from '../../../../services/IGraphService';

export interface IGroupTooltipProps {
    node: IGroupNode;
    x: number;
    y: number;
}

export const GroupTooltip: React.FC<IGroupTooltipProps> = ({ node, x, y }) => {
    const maxVisibleMembers = 4;
    const visibleMembers = node.members ? node.members.slice(0, maxVisibleMembers) : [];
    const remainingCount = node.members ? Math.max(0, node.members.length - maxVisibleMembers) : 0;

    return (
        <div
            className={styles.tooltip}
            style={{
                left: `${x + 15}px`,
                top: `${y + 15}px`
            }}
        >
            <div className={styles.header}>
                <h3 className={styles.title}>{node.displayName}</h3>
            </div>

            {node.description && (
                <p className={styles.description}>{node.description}</p>
            )}

            {node.members && node.members.length > 0 && (
                <div className={styles.members}>
                    <div className={styles.avatars}>
                        {visibleMembers.map((member) => (
                            <div key={member.id} className={styles.avatar} title={member.displayName}>
                                {member.photoBlobUrl ? (
                                    <img src={member.photoBlobUrl} alt={member.displayName} />
                                ) : (
                                    <div className={styles.avatarInitials}>
                                        {member.displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                        {remainingCount > 0 && (
                            <div className={styles.avatar}>
                                <div className={styles.avatarMore}>+{remainingCount}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
