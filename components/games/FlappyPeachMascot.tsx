import {
  Circle,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export function FlappyPeachMascotGradients() {
  return (
    <>
      <LinearGradient id="mascotPeachBody" x1="65" x2="177" y1="48" y2="198" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFD08A" />
        <Stop offset="0.48" stopColor="#FF8F9F" />
        <Stop offset="1" stopColor="#F25383" />
      </LinearGradient>
      <LinearGradient id="mascotPeachGlow" x1="78" x2="118" y1="67" y2="136" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFF3CE" stopOpacity={0.9} />
        <Stop offset="1" stopColor="#FFF3CE" stopOpacity={0} />
      </LinearGradient>
      <LinearGradient id="mascotWingFill" x1="0" x2="1" y1="0" y2="1">
        <Stop offset="0" stopColor="#FFFBE3" />
        <Stop offset="1" stopColor="#FFD7DB" />
      </LinearGradient>
      <LinearGradient id="mascotLeafFill" x1="109" x2="177" y1="35" y2="67" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#8CE0A8" />
        <Stop offset="1" stopColor="#48AE74" />
      </LinearGradient>
    </>
  );
}

export function FlappyPeachMascot({
  centerX,
  centerY,
  motionFrame,
  renderSize = 64,
}: {
  centerX: number;
  centerY: number;
  motionFrame: number;
  renderSize?: number;
}) {
  const scale = renderSize / 240;
  const wingWave = (Math.sin(motionFrame * 0.9) + 1) / 2;
  const hoverWave = Math.sin(motionFrame * 0.14);
  const farWingRotation = 15 - wingWave * 34;
  const nearWingRotation = 24 - wingWave * 44;
  const farWingScaleY = 0.9 + wingWave * 0.16;
  const nearWingScaleY = 0.88 + wingWave * 0.16;
  const leafRotation = -3 + ((hoverWave + 1) / 2) * 7;
  const blinkFrame = motionFrame % 84;
  const eyeScaleY = blinkFrame >= 80 && blinkFrame <= 81 ? 0.08 : 1;
  const spriteX = centerX - 120 * scale;
  const spriteY = centerY - 120 * scale + hoverWave * 1.1;

  return (
    <G transform={`translate(${spriteX} ${spriteY}) scale(${scale})`}>
      <Ellipse cx={121} cy={207} rx={47} ry={8} fill="#4B2036" opacity={0.12} />

      <G transform={`translate(105 126) rotate(${farWingRotation}) scale(1 ${farWingScaleY}) translate(-105 -126)`}>
        <Path
          d="M105 108C95 80 70 62 53 72C42 79 48 95 61 104C44 99 31 107 34 120C38 133 60 132 81 126Z"
          fill="url(#mascotWingFill)"
          stroke="#4B2036"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <Path
          d="M54 79C69 91 80 103 94 117M42 115C59 116 75 119 88 122"
          fill="none"
          stroke="#F2A4B7"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.72}
        />
      </G>

      <Path
        d="M120 62C97 39 63 48 51 79C38 113 51 153 80 181C93 194 107 201 122 203C138 199 152 188 164 171C186 142 199 107 188 79C179 56 162 46 144 48C134 49 126 54 120 62Z"
        fill="url(#mascotPeachBody)"
        stroke="#4B2036"
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path d="M120 66C109 78 106 94 107 110" fill="none" stroke="#C93F6E" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <Path d="M120 66C131 78 134 92 133 105" fill="none" stroke="#C93F6E" strokeWidth={5} strokeLinecap="round" opacity={0.3} />
      <Ellipse cx={88} cy={91} rx={23} ry={31} fill="url(#mascotPeachGlow)" transform="rotate(-22 88 91)" />

      <Path d="M119 61C117 49 119 38 126 28" fill="none" stroke="#4B2036" strokeWidth={7} strokeLinecap="round" />
      <G transform={`translate(126 50) rotate(${leafRotation}) translate(-126 -50)`}>
        <Path
          d="M126 45C138 24 164 24 178 39C165 57 144 62 126 50Z"
          fill="url(#mascotLeafFill)"
          stroke="#4B2036"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <Path d="M132 48C146 42 156 38 168 38" fill="none" stroke="#D6FFD9" strokeWidth={3.5} strokeLinecap="round" opacity={0.82} />
      </G>

      <G transform={`translate(113 130) rotate(${nearWingRotation}) scale(1 ${nearWingScaleY}) translate(-113 -130)`}>
        <Path
          d="M112 112C88 95 55 96 46 112C39 124 51 135 68 136C52 143 47 157 58 165C72 176 96 153 113 133Z"
          fill="url(#mascotWingFill)"
          stroke="#4B2036"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <Path
          d="M51 114C70 116 87 122 104 130M61 160C76 149 90 139 106 133"
          fill="none"
          stroke="#F2A4B7"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.72}
        />
      </G>

      <G transform={`translate(153 116) scale(1 ${eyeScaleY}) translate(-153 -116)`}>
        <Ellipse cx={153} cy={116} rx={10} ry={13} fill="#3A1F2C" />
        <Circle cx={150} cy={111} r={3.3} fill="#FFFFFF" />
      </G>
      <Path d="M143 99C150 95 158 96 163 100" fill="none" stroke="#7F294F" strokeWidth={4} strokeLinecap="round" opacity={0.65} />
      <Path d="M151 145C157 151 168 149 172 142" fill="none" stroke="#7F294F" strokeWidth={5} strokeLinecap="round" />
    </G>
  );
}
