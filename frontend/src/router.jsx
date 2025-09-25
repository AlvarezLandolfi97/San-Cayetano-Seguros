import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Hero from './components/Hero'

function Protected({children}){
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

export default function Router(){
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/hero" element={<Hero/>} />
    </Routes>
  )
}
