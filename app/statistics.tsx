import { router } from 'expo-router';
import { useState } from 'react';

import { StatisticsContent } from '../components/StatisticsPanel';
import { useBootyblock } from '../lib/store/BootyblockProvider';

export default function Statistics() {
  const { unlockHistory, bonusXp } = useBootyblock();
  const [now] = useState(Date.now);

  return (
    <StatisticsContent
      history={unlockHistory}
      bonusXp={bonusXp}
      now={now}
      onClose={() => router.back()}
    />
  );
}
