/** Tag colour for a vote average (callers only pass rated votes, i.e. > 0). */
export const voteColor = (vote: number): string => (vote >= 7 ? 'green' : vote >= 5 ? 'gold' : 'red');
