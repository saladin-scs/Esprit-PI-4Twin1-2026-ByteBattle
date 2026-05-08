import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { challengesApi } from '../services/api';
import { RootState } from '../store/store';

export const useRecommendationTracking = (itemId: string | undefined) => {
  const username = useSelector((state: RootState) => state.auth.user?.username);
  const startTimeRef = useRef<number | null>(null);

  const getEngagementContext = () => ({
    device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    userAgent: navigator.userAgent,
    timeOfDay: new Date().getHours(),
    referrer: document.referrer || 'direct',
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    sessionStart: startTimeRef.current,
    url: window.location.href,
  });

  useEffect(() => {
    if (!username || !itemId) return;

    startTimeRef.current = Date.now();

    // Track impression immediately
    challengesApi.trackEngagement({
      userId: username,
      itemId,
      eventType: 'impression',
      context: getEngagementContext(),
    }).catch(() => {});

    return () => {
      if (startTimeRef.current) {
        const dwellTime = Date.now() - startTimeRef.current;
        if (dwellTime > 1000) { // Only track if dwell time > 1s
          challengesApi.trackEngagement({
            userId: username,
            itemId,
            eventType: 'dwell',
            value: dwellTime,
            context: {
              ...getEngagementContext(),
              dwellTimeMs: dwellTime,
            },
          }).catch(() => {}); // Silent fail for telemetry
        }
      }
    };
  }, [username, itemId]);

  const trackClick = () => {
    if (!username || !itemId) return;
    challengesApi.trackEngagement({
      userId: username,
      itemId,
      eventType: 'click',
      context: getEngagementContext(),
    }).catch(() => {});
  };

  return { trackClick };
};
