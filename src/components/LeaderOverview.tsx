import { ManagerDashboard } from './ManagerDashboard';
import { Reports } from './Reports';

export function LeaderOverview({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  return (
    <div className="space-y-4">
      <ManagerDashboard theme={theme} />
      <Reports theme={theme} />
    </div>
  );
}

