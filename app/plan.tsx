import { Redirect } from 'expo-router';

export default function RetiredPlanRoute() {
  return <Redirect href={{ pathname: '/(tabs)', params: { openUnlock: '1' } }} />;
}
