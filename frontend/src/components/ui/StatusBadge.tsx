import React from 'react';

interface StatusBadgeProps {
  status?: string;
  flaggedProxy?: boolean;
  systemVerified?: boolean;
  professorVerified?: boolean;
  taVerified?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  flaggedProxy,
  systemVerified,
  professorVerified,
  taVerified,
}) => {
  if (status === 'APPROVED') return <span className="badge badge-green">Approved</span>;
  if (status === 'REJECTED') return <span className="badge badge-red">Rejected</span>;
  if (flaggedProxy) return <span className="badge badge-yellow">Flagged</span>;
  if (professorVerified && taVerified) return <span className="badge badge-green">Fully Verified</span>;
  if (professorVerified) return <span className="badge badge-blue">Prof Verified</span>;
  if (systemVerified) return <span className="badge badge-blue">System Verified</span>;
  return <span className="badge badge-gray">Pending</span>;
};

export default StatusBadge;
