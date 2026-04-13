export interface FilterParams {
  /** Only include person relationships active in this year */
  year?: number;
  /** Only include contract edges above this value (LT) */
  minContractValue?: number;
}
