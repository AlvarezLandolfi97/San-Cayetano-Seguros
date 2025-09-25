import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'

export default function Dashboard(){
  const [policies, setPolicies] = useState([])
  useEffect(()=>{ api.get('/policies/').then(r=> setPolicies(r.data)) },[])
  return (
    <div style={{padding:24}}>
      <h2>Mis vehículos</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16}}>
        {policies.map(p=> (
          <div key={p.id} style={{background:'#fff', padding:16, borderRadius:12}}>
            <h3>{p.license_plate}</h3>
            <div>Estado: {p.state}</div>
            <div>Plan: {p.product}</div>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <a href="#" style={{background:'#0D47A1', color:'#fff', padding:'6px 10px', borderRadius:8}}>Ver póliza</a>
              <a href="tel:+540800000000">Grúa</a>
              <Link to={`/policy/${p.id}`}>Comprobantes / Pagar</Link>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16}}>
        <Link to="/quote">Cotizar otro vehículo</Link>
      </div>
    </div>
  )
}
