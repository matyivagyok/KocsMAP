import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [
 21.62601, 47.53184  
]
const INITIAL_ZOOM = 14.01

function App() {
  const mapRef = useRef()
  const mapContainerRef = useRef()

  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)

  const kocsmak = [
    { id: 1, nev: 'Kocsma Béla', lat: 47.53817, lng: 21.62523, nyitvatartas: '12:00 - 02:00', cim: 'Bem Ter 1' },
    { id: 2, nev: 'Söröző Gizi', lat: 47.53738, lng: 21.62537, nyitvatartas: '16:00 - 00:00', cim: 'Peterfia 46' },
    { id: 3, nev: 'Pub Pista', lat: 47.54092, lng: 21.62500, nyitvatartas: '10:00 - 01:00', cim: 'Peterfia 56' },
  ]

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibWF0eWl2YWd5b2siLCJhIjoiY2tpM2JwajFtMGRvaTJ6cXNqMnhndWliZiJ9.b3f7EIEdmrAsv8V87pjZkQ'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: center,
      zoom: zoom,
      style: 'mapbox://styles/matyivagyok/cm9vvy1ak00sf01s5hyfz1kf0',
    });

    mapRef.current.on('move', () => {
      // get the current center coordinates and zoom level from the map
      const mapCenter = mapRef.current.getCenter()
      const mapZoom = mapRef.current.getZoom()

      // update state
      mapRef.current.on('move', () => {
        const mapCenter = mapRef.current.getCenter()
        const mapZoom = mapRef.current.getZoom()
        setCenter([mapCenter.lng, mapCenter.lat])
        setZoom(mapZoom)
      })
    })

        // Add markers for each pub

    kocsmak.forEach(kocsma => {
      const marker = new mapboxgl.Marker()
        .setLngLat([kocsma.lng, kocsma.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setText(`${kocsma.nev} – Nyitvatartás: ${kocsma.nyitvatartas} – Cím: ${kocsma.cim}`)
        )
        .addTo(mapRef.current)
    })

    return () => {
      mapRef.current.remove()
    }
  }, [])

  const handleButtonClick = () => {
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    })
  }
  return (
    <>
      <div className="sidebar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <button className='reset-button' onClick={handleButtonClick}>
        Reset
      </button>
      <div id='map-container' ref={mapContainerRef} />
    </>
  )
}

export default App