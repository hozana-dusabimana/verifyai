import { useAuth } from '../contexts/AuthContext';
import CitizenDashboard from './dashboards/CitizenDashboard';
import JournalistDashboard from './dashboards/JournalistDashboard';
import GovernmentDashboard from './dashboards/GovernmentDashboard';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const role = user?.role;

  if (role === 'journalist') return <JournalistDashboard />;
  if (role === 'government') return <GovernmentDashboard />;
  if (role === 'admin') return <JournalistDashboard />; // admins also benefit from the journalist analytics view alongside their console
  return <CitizenDashboard />;
};

export default Dashboard;
