export type Member = { id: string; name: string };
export type Room = { id: string; name: string; floor: string | null; item_count?: number };
export type VoteLevel = "want" | "maybe" | "no";
export type Destination = "undecided" | "family" | "sell" | "donate" | "clearance" | "recycle" | "trash";

export type Item = {
  id: string;
  room_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  destination: Destination;
  assigned_member_id: string | null;
  status: "open" | "decided" | "removed";
  created_at: string;
  room?: Room;
  votes?: Array<{ member_id: string; level: VoteLevel; member?: Member }>;
};
