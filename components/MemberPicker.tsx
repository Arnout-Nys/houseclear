"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Member } from "@/lib/types";
export function useMember(){const [members,setMembers]=useState<Member[]>([]);const [selected,setSelectedState]=useState("");useEffect(()=>{api<Member[]>("/api/members").then(m=>{setMembers(m);const saved=localStorage.getItem("houseclear_member");setSelectedState(saved&&m.some(x=>x.id===saved)?saved:(m[0]?.id||""))}).catch(()=>{})},[]);function setSelected(id:string){setSelectedState(id);localStorage.setItem("houseclear_member",id)}return {members,selected,setSelected}}
export function MemberPicker({members,selected,setSelected}:{members:Member[],selected:string,setSelected:(id:string)=>void}){return <div><div className="subtle" style={{marginBottom:7}}>I am…</div><div className="memberbar">{members.map(m=><button key={m.id} className={`memberchip ${selected===m.id?"active":""}`} onClick={()=>setSelected(m.id)}>{m.name}</button>)}</div></div>}
