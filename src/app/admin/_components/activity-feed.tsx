interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: React.ReactNode;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
}

export function ActivityFeed({ activities, title }: ActivityFeedProps) {
  if (activities.length === 0) return null;

  return (
    <div className="space-y-1">
      {activities.map((activity, i) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors -mx-2"
        >
          {activity.icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 mt-0.5 shrink-0">
              {activity.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{activity.timestamp}</span>
        </div>
      ))}
    </div>
  );
}
