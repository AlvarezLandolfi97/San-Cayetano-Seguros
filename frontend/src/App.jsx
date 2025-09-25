import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Router from './router'
import { getToken } from './auth'
import { setAuth } from './api'

export default function App(){
  useEffect(()=>{ const t = getToken(); if(t) setAuth(t) },[])
  return (
    <div style={{fontFamily:'system-ui', background:'#f5f7fa', minHeight:'100vh'}}>
      <nav style={{background:'#0D47A1', color:'#fff', padding:'10px 16px', display:'flex', gap:16}}>
        <Link to="/" style={{color:'#fff', textDecoration:'none', fontWeight:700}}>Aseguradora</Link>
        <Link to="/quote" style={{color:'#fff'}}>Cotizar</Link>
        <Link to="/login" style={{color:'#fff', marginLeft:'auto'}}>Iniciar sesión</Link>
        <a href="https://wa.me/5492210000000" style={{color:'#fff'}}>WhatsApp</a>
      </nav>
      <Router/>
    </div>
  )
}
