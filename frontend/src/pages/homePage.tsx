import React, { JSX } from "react";
import { useSelector } from "react-redux";
import * as Tabs from "@radix-ui/react-tabs";
import * as Progress from "@radix-ui/react-progress";
import * as HoverCard from "@radix-ui/react-hover-card";
import * as Separator from "@radix-ui/react-separator";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Users, Calendar, Award, Clock, TrendingUp, Info } from "lucide-react";
import type { RootState } from "@/redux/store";

/**
 * Interface for statistic card data
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}

/**
 * Interface for activity item data
 */
interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

/**
 * StatCard Component
 * Displays a single statistic with icon and optional trend indicator
 *
 * @param {StatCardProps} props - Component properties
 * @returns {JSX.Element} Statistic card component
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color }: StatCardProps): JSX.Element => {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${color} hover:shadow-md transition-shadow`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-2xl font-semibold mt-1">{value}</p>

              {trend !== undefined && (
                <div className="flex items-center mt-2">
                  <span className={trend >= 0 ? "text-green-500" : "text-red-500"}>
                    {trend >= 0 ? "+" : ""}
                    {trend}%
                  </span>
                  <TrendingUp size={16} className={`ml-1 ${trend >= 0 ? "text-green-500" : "text-red-500"}`} />
                </div>
              )}
            </div>
            <div className="p-2 rounded-full bg-gray-100 text-gray-600">{icon}</div>
          </div>
        </div>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content className="bg-white p-3 rounded-md shadow-lg border border-gray-200 w-60" sideOffset={5}>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm text-gray-500">{title}</span>
            <span className="font-bold text-lg">{value}</span>
            <p className="text-xs text-gray-600">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
          <HoverCard.Arrow className="fill-white" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

/**
 * ActivityItem Component
 * Displays a single activity item with icon
 *
 * @param {ActivityItemProps} props - Component properties
 * @returns {JSX.Element} Activity item component
 */
const ActivityItem: React.FC<ActivityItemProps> = ({ title, description, timestamp, icon }) => {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="p-2 rounded-full bg-blue-50 text-blue-600">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{timestamp}</p>
      </div>
    </div>
  );
};

/**
 * ProgressCard Component
 * Displays a progress indicator with label
 *
 * @param {object} props - Component properties
 * @returns {JSX.Element} Progress card component
 */
const ProgressCard: React.FC<{ label: string; value: number; target: number }> = ({ label, value, target }) => {
  const percentage = Math.min(Math.round((value / target) * 100), 100);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <Info size={14} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="bg-gray-800 text-white text-xs px-2 py-1 rounded" sideOffset={5}>
                Target: {target}
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-semibold">{value}</span>
        <span className="text-xs text-gray-500 mb-1">/ {target}</span>
      </div>
      <Progress.Root className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-2" value={percentage}>
        <Progress.Indicator
          className="h-full bg-blue-600 transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </Progress.Root>
      <span className="text-xs text-gray-500 mt-1">{percentage}% complete</span>
    </div>
  );
};

export default function Home() {
  // Fetch user from Redux store - adjust this according to your Redux setup
  const { user } = useSelector((state: RootState) => state.auth);

  // Mock data - in a real app, these would come from the Redux store
  const stats = [
    { title: "Total Users", value: "1,249", icon: <Users size={20} />, trend: 12.5, color: "border-blue-500" },
    { title: "Total Events", value: "42", icon: <Calendar size={20} />, trend: -2.4, color: "border-violet-500" },
    { title: "Completion Rate", value: "89%", icon: <Award size={20} />, trend: 5.6, color: "border-green-500" },
  ];

  const recentActivities = [
    {
      title: "User Registration",
      description: "New user registered via email signup",
      timestamp: "2 hours ago",
      icon: <Users size={18} />,
    },
    {
      title: "Event Created",
      description: "New community event was created",
      timestamp: "Yesterday",
      icon: <Calendar size={18} />,
    },
  ];

  return (
    <div className="bg-gray-100 p-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="font-semibold text-2xl text-gray-800">👋 Welcome{user ? `, ${user.name}` : ""}</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your platform today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map(stat => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            color={stat.color}
          />
        ))}
      </div>

      {/* Progress Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ProgressCard label="Weekly Target" value={42} target={50} />
        <ProgressCard label="Monthly Goal" value={156} target={200} />
      </div>

      <Separator.Root className="h-px bg-gray-200 my-6" />

      {/* Recent Activity */}
      <Tabs.Root defaultValue="activity">
        <Tabs.List className="flex border-b border-gray-200 mb-4">
          <Tabs.Trigger
            value="activity"
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Recent Activity
          </Tabs.Trigger>
          <Tabs.Trigger
            value="notifications"
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Notifications
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="activity" className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Latest Activities</h3>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock size={14} /> Last 24 hours
            </span>
          </div>
          {recentActivities.map((activity, index) => (
            <React.Fragment key={activity.title}>
              <ActivityItem {...activity} />
              {index < recentActivities.length - 1 && <Separator.Root className="h-px bg-gray-100" />}
            </React.Fragment>
          ))}
        </Tabs.Content>

        <Tabs.Content value="notifications" className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-center py-6 text-gray-500">
            <p>No new notifications at this time.</p>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
