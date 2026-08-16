"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Member } from "@/lib/types";

const MEMBER_KEY = "houseclear_member";
const MEMBER_EVENT = "houseclear:member-changed";

export function useMember() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelectedState] = useState("");

  useEffect(() => {
    let mounted = true;

    api<Member[]>("/api/members")
      .then((list) => {
        if (!mounted) return;
        setMembers(list);
        const saved = localStorage.getItem(MEMBER_KEY);
        setSelectedState(saved && list.some((x) => x.id === saved) ? saved : (list[0]?.id || ""));
      })
      .catch(() => {});

    function syncMember(event: Event) {
      const id = (event as CustomEvent<string>).detail || localStorage.getItem(MEMBER_KEY) || "";
      setSelectedState(id);
    }

    window.addEventListener(MEMBER_EVENT, syncMember);
    window.addEventListener("storage", syncMember);

    return () => {
      mounted = false;
      window.removeEventListener(MEMBER_EVENT, syncMember);
      window.removeEventListener("storage", syncMember);
    };
  }, []);

  function setSelected(id: string) {
    setSelectedState(id);
    localStorage.setItem(MEMBER_KEY, id);
    window.dispatchEvent(new CustomEvent(MEMBER_EVENT, { detail: id }));
  }

  return { members, selected, setSelected };
}

export function MemberPicker({
  members,
  selected,
  setSelected
}: {
  members: Member[];
  selected: string;
  setSelected: (id: string) => void;
}) {
  return (
    <div>
      <div className="subtle" style={{ marginBottom: 7 }}>Ik ben…</div>
      <div className="memberbar">
        {members.map((member) => (
          <button
            key={member.id}
            className={`memberchip ${selected === member.id ? "active" : ""}`}
            onClick={() => setSelected(member.id)}
          >
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}
