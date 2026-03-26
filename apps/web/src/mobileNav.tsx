import type { ReactNode } from "react";
import type { AppView } from "@cet6/domain/types";

function MobileNavIcon(props: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mobile-nav-icon-svg">
      {props.children}
    </svg>
  );
}

export const ALL_APP_VIEWS: AppView[] = ["dashboard", "vocabulary", "specials", "exams", "wrong", "stats", "settings"];

export const DEFAULT_MOBILE_PINNED_VIEWS: AppView[] = ["dashboard", "vocabulary", "specials", "exams"];

export const mobileNavLabels: Record<AppView, string> = {
  dashboard: "计划",
  vocabulary: "词汇",
  specials: "专项",
  exams: "真题",
  wrong: "错题",
  stats: "统计",
  settings: "设置"
};

export const mobileNavTitles: Record<AppView, string> = {
  dashboard: "今日计划",
  vocabulary: "词汇",
  specials: "专项",
  exams: "真题",
  wrong: "错题本",
  stats: "统计",
  settings: "设置"
};

export const mobileNavIcons: Record<AppView, ReactNode> = {
  dashboard: (
    <MobileNavIcon>
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </MobileNavIcon>
  ),
  vocabulary: (
    <MobileNavIcon>
      <path d="M6 5.5h9a3 3 0 0 1 3 3v10.5a16 16 0 0 0-4-1 19 19 0 0 0-8 1V7.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </MobileNavIcon>
  ),
  specials: (
    <MobileNavIcon>
      <path d="M5 7.5h14M7 12h10M9 16.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </MobileNavIcon>
  ),
  exams: (
    <MobileNavIcon>
      <rect x="5" y="4.5" width="14" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 9.5h6M9 13h6M9 16.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </MobileNavIcon>
  ),
  wrong: (
    <MobileNavIcon>
      <path d="m8 8 8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </MobileNavIcon>
  ),
  stats: (
    <MobileNavIcon>
      <path d="M6 18V11M12 18V7M18 18v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </MobileNavIcon>
  ),
  settings: (
    <MobileNavIcon>
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 13.2v-2.4l-1.9-.6a5.6 5.6 0 0 0-.5-1.1l.9-1.8-1.7-1.7-1.8.9c-.4-.2-.7-.3-1.1-.4L12.3 4H9.7l-.6 1.9c-.4.1-.8.2-1.1.4l-1.8-.9-1.7 1.7.9 1.8c-.2.3-.4.7-.5 1.1l-1.9.6v2.4l1.9.6c.1.4.3.8.5 1.1l-.9 1.8 1.7 1.7 1.8-.9c.3.2.7.3 1.1.4l.6 1.9h2.6l.6-1.9c.4-.1.8-.2 1.1-.4l1.8.9 1.7-1.7-.9-1.8c.2-.3.4-.7.5-1.1z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </MobileNavIcon>
  )
};

export function normalizeMobilePinnedViews(input?: AppView[] | null) {
  if (input == null) {
    return DEFAULT_MOBILE_PINNED_VIEWS;
  }
  return input.filter((view, index, all): view is AppView => ALL_APP_VIEWS.includes(view) && all.indexOf(view) === index);
}
