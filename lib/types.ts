export type Member = {
  id: string;
  name: string;
  is_decision_maker?: boolean;
};

export type Room = {
  id: string;
  name: string;
  floor: string | null;
  item_count?: number;
};

export type VoteLevel =
  | "want"
  | "maybe"
  | "no";

export type Destination =
  | "undecided"
  | "family"
  | "sell"
  | "donate"
  | "clearance"
  | "recycle"
  | "trash";

export type Item = {
  id: string;

  room_id: string;

  title: string;

  description: string | null;

  photo_url: string | null;

  destination: Destination | null;

  assigned_member_id: string | null;

  status:
    | "undecided"
    | "open"
    | "decided"
    | "removed";

  created_at: string;

  rooms?: Room;

  item_photos?: Array<{
    id: string;
    url: string;
    sort_order?: number;
  }>;

  votes?: Array<{
    member_id: string;
    level: VoteLevel;

    members?: Member;
  }>;
};
