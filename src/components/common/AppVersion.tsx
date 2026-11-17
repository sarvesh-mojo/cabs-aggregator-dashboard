import { APP_VERSION } from "../../config/appVersion";

type AppVersionProps = {
  className?: string;
  /** Compact for header; default is footer-style on login. */
  compact?: boolean;
};

/** Visible deploy marker — compare against package.json after each release. */
export default function AppVersion({ className = "", compact = false }: AppVersionProps) {
  if (compact) {
    return (
      <span
        className={`font-mono text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap ${className}`}
        title={`App version ${APP_VERSION}`}
      >
        v{APP_VERSION}
      </span>
    );
  }

  return (
    <p
      className={`mt-6 text-center text-xs text-gray-400 dark:text-gray-500 font-mono ${className}`}
      title="Deployed build version"
    >
      Version {APP_VERSION}
    </p>
  );
}
