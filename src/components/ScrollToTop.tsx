import React, { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Back/Forward (POP) leaves scroll restoration to the browser; only new navigations start at the top.
    if (navigationType === 'POP') return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per pathname change; the type is read with it
  }, [pathname]);

  return null;
};

export default ScrollToTop;
