import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { StatisticsContent } from '../components/StatisticsPanel';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Statistics() {
  const { unlockHistory, bonusXp } = useBootyblock();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StatisticsContent
      history={unlockHistory}
      bonusXp={bonusXp}
      now={now}
      onClose={() => router.back()}
    />
  );
}
