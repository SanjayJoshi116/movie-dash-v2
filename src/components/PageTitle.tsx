import React, { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import { useLocation } from 'react-router';
import { setDocumentTitle } from '../utils/documentTitle';
import { noteNavigation } from '../utils/firstPage';

const { Title } = Typography;

interface PageTitleProps {
  /** The page name: the heading text and the start of `document.title` ("Movies · MovieDash"). */
  title: string;
  /** Decorative emoji shown before the title, hidden from screen readers. */
  emoji?: string;
  style?: React.CSSProperties;
}

/**
 * A page's h3 heading (B33). It names the browser tab, and after a client-side navigation it takes
 * focus, so a screen reader announces the new page instead of staying silent on the nav link.
 * The first page of a visit (until the path first changes) keeps the browser's normal focus.
 * preventScroll leaves scrolling to ScrollToTop / the browser's Back restoration.
 */
const PageTitle: React.FC<PageTitleProps> = ({ title, emoji, style }) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    setDocumentTitle(title);
  }, [title]);

  // Mount only: the page mounts once per navigation into it; a ?tab= change must not steal focus.
  useEffect(() => {
    if (noteNavigation(pathname)) ref.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only, see above
  }, []);

  return (
    <Title ref={ref} level={3} tabIndex={-1} className="page-title" style={{ color: 'var(--text-primary)', marginBottom: 4, ...style }}>
      {emoji && <span aria-hidden="true">{emoji} </span>}
      {title}
    </Title>
  );
};

export default PageTitle;
