import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { challengesApi } from '../services/api';
import { RootState } from '../store/store';

export const useRecommendationTracking = (itemId: string | undefined) => {
  const username = useSelector((state: RootState) => state.auth.user?.username);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!username || !itemId) return;

    startTimeRef.current = Date.now();

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
              device: navigator.userAgent,
              timeOfDay: new Date().getHours().toString(),
              referrer: document.referrer || 'direct',
            },
          }).catch(() => { }); // Silent fail for telemetry
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
      context: {
        device: navigator.userAgent,
      },
    }).catch(() => { });
  };

  return { trackClick };
};
