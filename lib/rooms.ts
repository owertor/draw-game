import { supabase } from "./supabase";
import { WORD_LIST } from "./word-list";

export const ROOM_ROUNDS = 5;
// Unambiguous alphabet (no 0/O/1/I) for shareable codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface Room {
  id: string;
  code: string;
  words: string[];
  creator_id: string | null;
}

export interface RoomResult {
  user_id: string;
  nickname: string;
  avatar: string;
  score: number;
}

function makeCode(len = 5): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

function pickSeedWords(n = ROOM_ROUNDS): string[] {
  const pool = WORD_LIST.map((w) => w.en);
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** Create a room with a fresh code and a shared word seed. */
export async function createRoom(creatorId: string): Promise<Room | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code: makeCode(), words: pickSeedWords(), creator_id: creatorId })
      .select("id, code, words, creator_id")
      .single();
    if (!error && data) return data as Room;
    // unique-code collision → retry with a new code
  }
  return null;
}

export async function getRoom(code: string): Promise<Room | null> {
  const { data } = await supabase
    .from("rooms")
    .select("id, code, words, creator_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as Room) ?? null;
}

export async function getRoomResults(roomId: string): Promise<RoomResult[]> {
  const { data } = await supabase
    .from("room_results")
    .select("user_id, nickname, avatar, score")
    .eq("room_id", roomId)
    .order("score", { ascending: false });
  return (data as RoomResult[]) ?? [];
}

export async function submitRoomResult(
  roomId: string, userId: string, nickname: string, avatar: string, score: number
) {
  return supabase
    .from("room_results")
    .upsert({ room_id: roomId, user_id: userId, nickname, avatar, score }, { onConflict: "room_id,user_id" });
}
