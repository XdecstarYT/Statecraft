/**
 * A stable, vivid color per party, hashed from its id. Shared by every
 * party-colored visualization (District Map legend/tiles, the parliament
 * hemicycle) so a given party reads as the same color everywhere.
 */
export function partyColor(partyId: string): string {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 62%, 48%)`;
}
