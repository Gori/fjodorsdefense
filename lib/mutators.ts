export interface ChallengeMutatorDef {
  id: string;
  name: string;
  description: string;
}

export const CHALLENGE_MUTATORS: ChallengeMutatorDef[] = [
  {
    id: 'lean_pockets',
    name: 'Lean Pockets',
    description: 'Start each level with less money. Forces tighter early placements.',
  },
  {
    id: 'iron_night',
    name: 'Iron Night',
    description: 'Enemies hit harder and surge faster in late worlds.',
  },
];

export function getChallengeMutator(id: string) {
  return CHALLENGE_MUTATORS.find((entry) => entry.id === id) ?? null;
}
