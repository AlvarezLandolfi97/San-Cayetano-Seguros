import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminInspections(){
  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [selectedById, setSelectedById] = useState({})

  async function load(){
    const [a,b] = await Promise.all([ api.get('/inspections/'), api.get('/products/') ])
    setItems(a.data)
    setProducts(b.data)
    const initial = {}
    a.data.forEach(x => { initial[x.id] = x.selected_product || '' })
    setSelectedById(initial)
  }
  useEffect(()=>{ load() },[])

  function setSel(id, val){
    setSelectedById(prev => ({...prev, [id]: val}))
  }

  async function approve(id){
    const product_id = selectedById[id]
    if(!product_id){ return alert('Elegí un plan para aprobar') }
    await api.post(`/inspections/${id}/approve/`, { product_id })
    await load()
  }
  async function reject(id){
    const notes = prompt('Motivo del rechazo:') || ''
    await api.post(`/inspections/${id}/reject/`, { notes })
    await load()
  }

  return (
    <div style={{padding:24}}>
      <h2>Validaciones de pre-inspección</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:16}}>
        {items.map(x=> (
          <div key={x.id} style={{background:'#fff', padding:12, borderRadius:12}}>
            <div><b>{x.license_plate}</b> · {x.brand} {x.model} ({x.year})</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:8}}>
              {[x.front, x.left, x.right, x.back].map((img, i)=> (
                <img key={i} src={img} style={{width:'100%', borderRadius:8, objectFit:'cover', height:72}}/>
              ))}
            </div>
            <div style={{marginTop:8}}>Estado: {x.state}</div>
            <select value={selectedById[x.id] || ''} onChange={e=> setSel(x.id, e.target.value)} style={{marginTop:8, width:'100%'}}>
              <option value="">Elegir plan…</option>
              {products.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <button onClick={()=> approve(x.id)}>Aprobar</button>
              <button onClick={()=> reject(x.id)}>Rechazar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
