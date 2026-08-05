import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { HOPPER_PLATFORM_HEIGHT, HOPPER_PLAYER_SIZE } from '../../lib/games/peachHopper';
import { FlappyPeachMascot, FlappyPeachMascotGradients } from './FlappyPeachMascot';

export type HopperPlatform = {
  id: number;
  x: number;
  y: number;
  width: number;
  velocityX: number;
  visited: boolean;
  hasCollectible: boolean;
  collected: boolean;
};

type PeachHopperSceneProps = {
  width: number;
  height: number;
  playerY: number;
  charge: number;
  platforms: HopperPlatform[];
  frame: number;
};

function HopperPeach({
  centerX,
  top,
  charge,
  frame,
}: {
  centerX: number;
  top: number;
  charge: number;
  frame: number;
}) {
  const size = HOPPER_PLAYER_SIZE;
  const squash = Math.min(0.24, charge * 0.24);
  const scaleX = 1 + squash * 0.62;
  const scaleY = 1 - squash;
  const centerY = top + size / 2;

  return (
    <G transform={`translate(${centerX} ${centerY}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`}>
      <FlappyPeachMascot
        centerX={centerX}
        centerY={centerY}
        motionFrame={frame}
        renderSize={size}
      />
    </G>
  );
}

export function PeachHopperScene({
  width,
  height,
  playerY,
  charge,
  platforms,
  frame,
}: PeachHopperSceneProps) {
  const playerCenterX = width / 2;
  const cloudShift = (frame * 0.16) % Math.max(width + 180, 1);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="hopperSky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#6FCBFF" />
          <Stop offset="0.58" stopColor="#C8EEFF" />
          <Stop offset="1" stopColor="#FFE6EB" />
        </LinearGradient>
        <FlappyPeachMascotGradients />
        <LinearGradient id="platformTop" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#C8FFB5" />
          <Stop offset="1" stopColor="#72D59B" />
        </LinearGradient>
        <LinearGradient id="platformBase" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#8F4E7A" />
          <Stop offset="1" stopColor="#51263F" />
        </LinearGradient>
      </Defs>

      <Rect width={width} height={height} fill="url(#hopperSky)" />
      <Circle cx={width - 58} cy={72} r={34} fill="#FFF6A8" opacity={0.92} />
      <Circle cx={width - 68} cy={61} r={9} fill="#FFFFFF" opacity={0.4} />

      <G opacity={0.52} transform={`translate(${-cloudShift} 0)`}>
        {[50, width + 230].map((x) => (
          <G key={x}>
            <Ellipse cx={x} cy={108} rx={46} ry={13} fill="#FFFFFF" />
            <Circle cx={x - 17} cy={101} r={16} fill="#FFFFFF" />
            <Circle cx={x + 12} cy={98} r={21} fill="#FFFFFF" />
          </G>
        ))}
      </G>
      <G opacity={0.34} transform={`translate(${-(cloudShift * 0.55)} 0)`}>
        {[210, width + 390].map((x) => (
          <G key={x}>
            <Ellipse cx={x} cy={214} rx={35} ry={10} fill="#FFFFFF" />
            <Circle cx={x - 10} cy={207} r={13} fill="#FFFFFF" />
            <Circle cx={x + 13} cy={208} r={15} fill="#FFFFFF" />
          </G>
        ))}
      </G>

      {platforms.map((platform) => (
        <G key={platform.id}>
          <Ellipse
            cx={platform.x + platform.width / 2}
            cy={platform.y + HOPPER_PLATFORM_HEIGHT + 10}
            rx={platform.width * 0.43}
            ry={7}
            fill="#3A1F2C"
            opacity={0.11}
          />
          <Path
            d={`M${platform.x + 9} ${platform.y + 10} L${platform.x + platform.width - 9} ${platform.y + 10} L${platform.x + platform.width - 24} ${platform.y + 38} Q${platform.x + platform.width / 2} ${platform.y + 52} ${platform.x + 24} ${platform.y + 38} Z`}
            fill="url(#platformBase)"
          />
          <Rect
            x={platform.x}
            y={platform.y}
            width={platform.width}
            height={HOPPER_PLATFORM_HEIGHT}
            rx={9}
            fill="url(#platformTop)"
            stroke="#3A7E61"
            strokeWidth={2.5}
          />
          <Path
            d={`M${platform.x + 9} ${platform.y + 5} Q${platform.x + platform.width / 2} ${platform.y - 3} ${platform.x + platform.width - 9} ${platform.y + 5}`}
            fill="none"
            stroke="#F1FFE8"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.8}
          />
          {platform.hasCollectible && !platform.collected ? (
            <G>
              <Circle cx={platform.x + platform.width / 2} cy={platform.y - 27} r={12} fill="#FF8D94" stroke="#73304B" strokeWidth={2.4} />
              <Path d={`M${platform.x + platform.width / 2} ${platform.y - 39} Q${platform.x + platform.width / 2 + 4} ${platform.y - 47} ${platform.x + platform.width / 2 + 10} ${platform.y - 43}`} fill="none" stroke="#56AE72" strokeWidth={3} strokeLinecap="round" />
              <Circle cx={platform.x + platform.width / 2 - 4} cy={platform.y - 31} r={3.5} fill="#FFE4BA" opacity={0.8} />
            </G>
          ) : null}
        </G>
      ))}

      <HopperPeach centerX={playerCenterX} top={playerY} charge={charge} frame={frame} />
    </Svg>
  );
}

export function PeachHopperPreview({ width, height = 330 }: { width: number; height?: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setFrame((current) => (current + 1) % 100_000), 40);
    return () => clearInterval(interval);
  }, []);

  const jumpPhase = (frame % 82) / 82;
  const jumpArc = Math.sin(jumpPhase * Math.PI);
  const playerY = height - 104 - jumpArc * 116;
  const platformWidth = Math.max(92, width * 0.3);
  const platforms: HopperPlatform[] = [
    { id: 1, x: width / 2 - platformWidth / 2, y: height - 46, width: platformWidth, velocityX: 0, visited: true, hasCollectible: false, collected: false },
    { id: 2, x: 18 + Math.sin(frame * 0.025) * 18, y: height - 164, width: platformWidth * 0.9, velocityX: 0, visited: false, hasCollectible: true, collected: false },
    { id: 3, x: width - platformWidth - 22 + Math.sin(frame * 0.02) * 16, y: height - 274, width: platformWidth * 0.84, velocityX: 0, visited: false, hasCollectible: false, collected: false },
  ];

  return (
    <PeachHopperScene
      width={width}
      height={height}
      playerY={playerY}
      charge={jumpPhase > 0.86 ? (jumpPhase - 0.86) / 0.14 : 0}
      platforms={platforms}
      frame={frame}
    />
  );
}
