export type MembershipFunction = {
  x: number[];
  lo: number[];
  md: number[];
  hi: number[];
};

export type FuzzyParameterConfig = {
  nama: string;
  mf: MembershipFunction;
};

export type FuzzyConfigResponse = Record<string, FuzzyParameterConfig>;
