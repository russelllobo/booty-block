export type PeachPatchStage = {
  index: number;
  title: string;
  nextUnlock: string | null;
  nextUnlockDay: number | null;
  landSize: number;
  farmers: number;
  peachTrees: number;
  cropRows: number;
  hasBarn: boolean;
  hasPond: boolean;
  hasWindmill: boolean;
};

const PATCH_STAGES = [
  {
    day: 0,
    title: 'first sprouts',
    landSize: 8.4,
    farmers: 2,
    peachTrees: 2,
    cropRows: 3,
    hasBarn: false,
    hasPond: false,
    hasWindmill: false,
    unlock: 'the big barn',
  },
  {
    day: 7,
    title: 'tiny peach patch',
    landSize: 9.6,
    farmers: 3,
    peachTrees: 4,
    cropRows: 4,
    hasBarn: true,
    hasPond: false,
    hasWindmill: false,
    unlock: 'the farm pond',
  },
  {
    day: 21,
    title: 'peach grove',
    landSize: 10.8,
    farmers: 4,
    peachTrees: 7,
    cropRows: 5,
    hasBarn: true,
    hasPond: true,
    hasWindmill: false,
    unlock: 'the windmill',
  },
  {
    day: 45,
    title: 'busy little farm',
    landSize: 11.8,
    farmers: 5,
    peachTrees: 10,
    cropRows: 6,
    hasBarn: true,
    hasPond: true,
    hasWindmill: true,
    unlock: 'the hillside orchard',
  },
  {
    day: 70,
    title: 'thriving peach patch',
    landSize: 12.8,
    farmers: 6,
    peachTrees: 13,
    cropRows: 7,
    hasBarn: true,
    hasPond: true,
    hasWindmill: true,
    unlock: 'peach paradise',
  },
  {
    day: 90,
    title: 'peach paradise',
    landSize: 13.6,
    farmers: 8,
    peachTrees: 17,
    cropRows: 8,
    hasBarn: true,
    hasPond: true,
    hasWindmill: true,
    unlock: null,
  },
] as const;

export function getPeachPatchStage(completedDays: number): PeachPatchStage {
  const safeDays = Math.max(0, Math.min(90, Math.floor(completedDays)));
  let stageIndex = 0;

  for (let index = 0; index < PATCH_STAGES.length; index += 1) {
    if (safeDays >= PATCH_STAGES[index].day) stageIndex = index;
  }

  const stage = PATCH_STAGES[stageIndex];
  const nextStage = PATCH_STAGES[stageIndex + 1] ?? null;

  return {
    index: stageIndex,
    title: stage.title,
    nextUnlock: stage.unlock,
    nextUnlockDay: nextStage?.day ?? null,
    landSize: stage.landSize,
    farmers: stage.farmers,
    peachTrees: stage.peachTrees,
    cropRows: stage.cropRows,
    hasBarn: stage.hasBarn,
    hasPond: stage.hasPond,
    hasWindmill: stage.hasWindmill,
  };
}
