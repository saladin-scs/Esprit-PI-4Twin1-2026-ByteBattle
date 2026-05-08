/** Allowed rooms: competition:<mongoId> | challenge:<mongoId> */
export function isValidChatRoom(room: string): boolean {
  if (!room || typeof room !== 'string') return false;
  if (room.length > 120) return false;
  if (!(room.startsWith('competition:') || room.startsWith('challenge:'))) return false;
  return /^[a-zA-Z0-9:_-]+$/.test(room);
}

export function parseObjectIdSuffix(room: string): string | null {
  const prefix = room.startsWith('competition:') ? 'competition:' : room.startsWith('challenge:') ? 'challenge:' : '';
  if (!prefix) return null;
  const id = room.slice(prefix.length);
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return id;
}
