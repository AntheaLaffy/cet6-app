import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PropsWithChildren, ReactNode, TouchEvent } from "react";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true
});

export function Panel(props: PropsWithChildren<{ title?: string; eyebrow?: string; actions?: ReactNode; className?: string }>) {
  return (
    <section className={`panel ${props.className ?? ""}`.trim()}>
      {(props.title || props.eyebrow || props.actions) && (
        <header className={`panel-header ${props.actions ? "has-actions" : "no-actions"}`.trim()}>
          <div className="panel-heading">
            {props.eyebrow ? <p className="panel-eyebrow">{props.eyebrow}</p> : null}
            {props.title ? <h2 className="panel-title">{props.title}</h2> : null}
          </div>
          {props.actions ? <div className="panel-actions">{props.actions}</div> : null}
        </header>
      )}
      {props.children}
    </section>
  );
}

export function StatusPill(props: { tone: "neutral" | "accent" | "warning" | "danger" | "success"; children: ReactNode }) {
  return <span className={`status-pill tone-${props.tone}`}>{props.children}</span>;
}

export function MetricTile(props: { label: string; value: string; detail?: string }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">{props.label}</span>
      <strong className="metric-value">{props.value}</strong>
      {props.detail ? <span className="metric-detail">{props.detail}</span> : null}
    </div>
  );
}

export function EmptyState(props: PropsWithChildren<{ title: string; detail: string; actions?: ReactNode }>) {
  return (
    <div className="empty-state">
      <h3>{props.title}</h3>
      <p>{props.detail}</p>
      {props.actions ? <div className="empty-state-actions">{props.actions}</div> : null}
      {props.children}
    </div>
  );
}

export function MarkdownSection(props: {
  title?: string;
  content: string;
  tone?: "default" | "study";
  className?: string;
}) {
  const html = marked.parse(props.content, { async: false });

  return (
    <article className={`markdown-surface markdown-tone-${props.tone ?? "default"} ${props.className ?? ""}`.trim()}>
      {props.title ? <h3 className="markdown-surface-title">{props.title}</h3> : null}
      <div className="markdown-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

export function MobilePager(props: {
  pages: ReactNode[];
  currentPage: number;
  onPageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  showIndicators?: boolean;
  ariaLabel: string;
  className?: string;
  leadingLabel?: string;
}) {
  const count = props.pages.length;
  const safePage = Math.min(Math.max(props.currentPage, 0), Math.max(count - 1, 0));
  const todayLabel = props.leadingLabel ?? `${new Date().getMonth() + 1}/${new Date().getDate()}`;
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [scrollY, setScrollY] = useState(() => (typeof window === "undefined" ? 0 : window.scrollY));
  const [transientVisible, setTransientVisible] = useState(true);
  const [activeHeight, setActiveHeight] = useState(0);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    deltaX: number;
    axis: "idle" | "x" | "y";
  }>({
    startX: 0,
    startY: 0,
    deltaX: 0,
    axis: "idle"
  });
  const boundaryDragRef = useRef<{ active: boolean; direction: "previous" | "next" | null }>({
    active: false,
    direction: null
  });
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const revealTimerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const node = pageRefs.current[safePage];
    if (!node) {
      return;
    }

    function syncHeight() {
      setActiveHeight(node?.offsetHeight ?? 0);
    }

    syncHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncHeight);
      return () => window.removeEventListener("resize", syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    window.addEventListener("resize", syncHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [safePage, props.pages]);

  useLayoutEffect(() => {
    if (!viewportRef.current) {
      return;
    }
    viewportRef.current.style.setProperty("--mobile-pager-height", activeHeight > 0 ? `${activeHeight}px` : "auto");
  }, [activeHeight]);

  useLayoutEffect(() => {
    if (!trackRef.current) {
      return;
    }
    trackRef.current.style.setProperty("--mobile-pager-page", String(safePage));
    trackRef.current.style.setProperty("--mobile-pager-drag-offset", `${dragOffset}px`);
  }, [dragOffset, safePage]);

  function revealTopBar(duration = 900) {
    setTransientVisible(true);
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
    }
    revealTimerRef.current = window.setTimeout(() => {
      setTransientVisible(false);
      revealTimerRef.current = null;
    }, duration);
  }

  useEffect(() => {
    revealTopBar(900);
  }, []);

  function jumpTo(index: number) {
    revealTopBar();
    props.onPageChange(Math.min(Math.max(index, 0), Math.max(count - 1, 0)));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      axis: "idle"
    };
    boundaryDragRef.current = {
      active: false,
      direction: null
    };
    setDragging(true);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    const deltaX = touch.clientX - gestureRef.current.startX;
    const deltaY = touch.clientY - gestureRef.current.startY;
    const provisionalDirection = deltaX < 0 ? "next" : "previous";
    const provisionalTargetIndex = provisionalDirection === "next" ? safePage + 1 : safePage - 1;
    const approachingBoundary = provisionalTargetIndex < 0 || provisionalTargetIndex > count - 1;

    if (gestureRef.current.axis === "idle") {
      if (Math.abs(deltaX) > Math.abs(deltaY) + (approachingBoundary ? 2 : 6)) {
        gestureRef.current.axis = "x";
      } else if (Math.abs(deltaY) > Math.abs(deltaX) + 6) {
        gestureRef.current.axis = "y";
      }
    }

    if (gestureRef.current.axis === "x") {
      gestureRef.current.deltaX = deltaX;
      setTransientVisible(true);
      const direction = deltaX < 0 ? "next" : "previous";
      const targetIndex = direction === "next" ? safePage + 1 : safePage - 1;
      const atBoundary = targetIndex < 0 || targetIndex > count - 1;

      if (atBoundary) {
        boundaryDragRef.current = {
          active: true,
          direction
        };
        props.onBoundaryDrag?.({
          direction,
          deltaX: Math.min(Math.abs(deltaX), 156),
          phase: "move"
        });
        setDragOffset(0);
      } else {
        if (boundaryDragRef.current.active && boundaryDragRef.current.direction) {
          props.onBoundaryDrag?.({
            direction: boundaryDragRef.current.direction,
            deltaX: 0,
            phase: "cancel"
          });
        }
        boundaryDragRef.current = {
          active: false,
          direction: null
        };
        setDragOffset(Math.max(Math.min(deltaX, 96), -96));
      }
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  }

  function finishDrag() {
    const { deltaX, axis } = gestureRef.current;
    const boundaryThreshold = 16;
    const pageThreshold = 44;
    const direction = deltaX < 0 ? "next" : "previous";
    const targetIndex = direction === "next" ? safePage + 1 : safePage - 1;
    const atBoundary = targetIndex < 0 || targetIndex > count - 1;
    const completionThreshold = atBoundary ? boundaryThreshold : pageThreshold;

    if (axis === "x" && Math.abs(deltaX) > completionThreshold) {
      const direction = deltaX < 0 ? "next" : "previous";
      const targetIndex = direction === "next" ? safePage + 1 : safePage - 1;
      if (targetIndex < 0 || targetIndex > count - 1) {
        props.onBoundarySwipe?.(direction);
        revealTopBar();
      } else {
        jumpTo(targetIndex);
      }
    } else if (axis === "x") {
      if (boundaryDragRef.current.active && boundaryDragRef.current.direction) {
        props.onBoundaryDrag?.({
          direction: boundaryDragRef.current.direction,
          deltaX: 0,
          phase: "cancel"
        });
      }
      revealTopBar(500);
    }
    setDragging(false);
    setDragOffset(0);
    boundaryDragRef.current = {
      active: false,
      direction: null
    };
    gestureRef.current = {
      startX: 0,
      startY: 0,
      deltaX: 0,
      axis: "idle"
    };
  }

  if (count === 0) {
    return null;
  }

  const hideTopBar = scrollY > 24 && !dragging && !transientVisible;

  return (
    <div className={`mobile-pager ${props.className ?? ""}`.trim()} aria-label={props.ariaLabel}>
      {count > 1 && props.showIndicators !== false ? (
        <div className={`mobile-pager-controls mobile-pager-controls-top ${hideTopBar ? "is-hidden" : ""}`.trim()}>
          <span className="mobile-pager-leading">{todayLabel}</span>
          <div className="mobile-pager-indicators" role="tablist" aria-label={`${props.ariaLabel} 分页`}>
            {props.pages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`mobile-pager-dot ${index === safePage ? "active" : ""}`}
                onClick={() => jumpTo(index)}
                aria-label={`跳转到第 ${index + 1} 页`}
                aria-pressed={index === safePage}
              />
            ))}
          </div>
          <span className="mobile-pager-count">
            {safePage + 1}/{count}
          </span>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="mobile-pager-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishDrag}
        onTouchCancel={finishDrag}
      >
        <div
          ref={trackRef}
          className={`mobile-pager-track ${dragging ? "dragging" : ""}`}
        >
          {props.pages.map((page, index) => (
            <section
              key={index}
              ref={(node) => {
                pageRefs.current[index] = node;
              }}
              className="mobile-pager-page"
              aria-hidden={index !== safePage}
            >
              {page}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
