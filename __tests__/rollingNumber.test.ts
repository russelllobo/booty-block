import { nextRollingDigitPosition } from '../components/rollingNumberMath';

describe('nextRollingDigitPosition', () => {
  it('rolls wrapped increases downward through the next digit positions', () => {
    expect(nextRollingDigitPosition(3, 0, 'up')).toBe(10);
    expect(nextRollingDigitPosition(9, 0, 'up')).toBe(10);
  });

  it('rolls wrapped decreases upward through the previous digit positions', () => {
    expect(nextRollingDigitPosition(0, 3, 'down')).toBe(-7);
    expect(nextRollingDigitPosition(0, 9, 'down')).toBe(-1);
  });
});
