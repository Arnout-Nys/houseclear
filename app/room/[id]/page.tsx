"use client";
import Link from "next/link";
import {use,useEffect,useState} from "react";
import {api} from "@/lib/api";
import {Nav} from "@/components/Nav";

const destinationLabel:Record<string,string>={family:"👪 Family",sell:"💰 Sell",donate:"🎁 Donate",clearance:"🚚 Clearance",recycle:"♻️ Recycle",trash:"🗑️ Trash"};

export default function RoomPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{api<any[]>(`/api/items?room_id=${id}`).then(setItems).catch(()=>{})},[id]);
  const room=items[0]?.rooms;
  return <main className="shell stack"><div className="topbar"><div><Link className="subtle" href="/">← All rooms</Link><h1 className="title">{room?.name||"Room"}</h1><div className="subtle">{items.length} items</div></div><Link className="btn primary" href={`/add?room=${id}`}>+ Add</Link></div>
  {items.length===0?<div className="card empty">Nothing photographed here yet.<br/><br/><Link className="btn primary" href={`/add?room=${id}`}>📸 Add first item</Link></div>:
  <section className="stack">{items.map(item=>{const wanters=(item.votes||[]).filter((v:any)=>v.level==='want').map((v:any)=>v.members?.name).filter(Boolean);const photo=item.item_photos?.[0]?.url||item.photo_url;return <Link className="card item-row" href={`/item/${item.id}`} key={item.id}>{photo?<img className="thumb" src={photo} alt=""/>:<div className="thumb"/>}<div style={{minWidth:0}}><strong>{item.title}</strong><div className="badges" style={{marginTop:8}}>{item.status==='removed'&&<span className="badge">✅ Removed</span>}{item.destination&&<span className="badge">{destinationLabel[item.destination]||item.destination}</span>}{wanters.length>0&&<span className={wanters.length>1?"badge conflict":"badge"}>{wanters.length>1?"⚠️ ":"❤️ "}{wanters.join(", ")}</span>}</div></div></Link>})}</section>}
  <Nav/></main>
}
