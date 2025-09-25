import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function PolicyDetail(){
  const { id } = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ (async()=>{
    const { data } = await api.get(`/policies/${id}/`)
    setPolicy(data)
  })() },[id])

  async function pay(){
    setLoading(True)
  }

  async function pay(){
    setLoading(true)
    try{
      const { data } = await api.post(`/payments/policies/${id}/create_preference/`, { period: '202509' })
      window.location.href = data.init_point
    } finally { setLoading(false) }
  }

  if(!policy) return <div style={{padding:24}}>Cargando…</div>

  return (
    <div style={{padding:24}}>
      <h2>Póliza {policy.number}</h2>
      <div>Patente: {policy.license_plate}</div>
      <div>Estado: {policy.state}</div>
      <div style={{marginTop:12}}>
        {policy.state === 'PEND' && <button onClick={pay} disabled={loading} style={{background:'#0D47A1', color:'#fff', padding:'8px 12px', borderRadius:8}}>Pagar con Mercado Pago</button>}
      </div>
    </div>
  )
}
