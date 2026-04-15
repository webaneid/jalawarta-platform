"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

type Activity = {
  id: string;
  action: string;
  entityType: string | null;
  details: any;
  createdAt: Date | null;
  userName: string | null;
  userImage: string | null;
};

export default function ActivityLog({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm italic">
        Belum ada aktivitas tercatat.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ring-8 ring-white dark:ring-gray-950 overflow-hidden">
                    {activity.userImage ? (
                      <img src={activity.userImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{activity.userName || "System"}</span>{" "}
                      {formatAction(activity.action)}{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {activity.details?.title || activity.entityType || "Sistem"}
                      </span>
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-400">
                    <time dateTime={activity.createdAt?.toISOString()}>
                      {activity.createdAt ? formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: id }) : "-"}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatAction(action: string) {
  switch (action) {
    case "CREATE_POST": return "membuat artikel baru";
    case "UPDATE_POST": return "memperbarui artikel";
    case "DELETE_POST": return "menghapus artikel";
    case "CREATE_PAGE": return "membuat halaman baru";
    case "UPDATE_SETTING": return "mengubah pengaturan";
    case "LOGIN": return "berhasil masuk";
    default: return action.toLowerCase().replace("_", " ");
  }
}
