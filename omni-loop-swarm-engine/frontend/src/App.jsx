import { Route, Routes } from 'react-router-dom'
import Header from './Header.jsx'
import Docs from './pages/Docs.jsx'
import NotFound from './pages/NotFound.jsx'
import Tool from './pages/Tool.jsx'

export default function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Tool />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
