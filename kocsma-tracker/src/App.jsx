import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

// --- FIREBASE IMPORTOK ---
// Beimportáljuk a 'db'-t a firebase.js fájlból (figyelj a relatív útvonalra: ./)
import { db } from './firebase' 
import { collection, getDocs } from 'firebase/firestore'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [21.62601, 47.53184]
const INITIAL_ZOOM = 14.01

function App() {
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const markersRef = useRef([]) // Segítség a markerek törléséhez

  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  
  const [selectedKocsma, setSelectedKocsma] = useState(null)
  
  // A kocsmák listája mostantól dinamikus, üres tömbről indul
  const [kocsmak, setKocsmak] = useState([])

  // 1. Térkép inicializálása
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibWF0eWl2YWd5b2siLCJhIjoiY2tpM2JwajFtMGRvaTJ6cXNqMnhndWliZiJ9.b3f7EIEdmrAsv8V87pjZkQ'
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: center,
      zoom: zoom,
      style: 'mapbox://styles/matyivagyok/cm9vvy1ak00sf01s5hyfz1kf0',
    });

    mapRef.current.on('move', () => {
      const mapCenter = mapRef.current.getCenter()
      const mapZoom = mapRef.current.getZoom()
      setCenter([mapCenter.lng, mapCenter.lat])
      setZoom(mapZoom)
    })

    return () => {
      mapRef.current.remove()
    }
  }, []) 

  // 2. Adatok lekérése Firebase-ből (aszinkron módon)
  useEffect(() => {
    const fetchKocsmak = async () => {
      try {
        // Hivatkozás a 'kocsmak' gyűjteményre
        const querySnapshot = await getDocs(collection(db, "kocsmak"));
        
        // Dokumentumok átalakítása objektumokká
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() 
        }));
        
        console.log("Adatok betöltve:", data); // Ellenőrzés a konzolon
        setKocsmak(data);
      } catch (error) {
        console.error("Hiba az adatok lekérésekor:", error);
      }
    };

    fetchKocsmak();
  }, []);

  // 3. Markerek frissítése, ha változik a 'kocsmak' lista
  useEffect(() => {
    if (!mapRef.current || kocsmak.length === 0) return;

    // Régi markerek eltávolítása
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Újak kirakása
    kocsmak.forEach(kocsma => {
      if (kocsma.lat && kocsma.lng) {
        const marker = new mapboxgl.Marker()
          .setLngLat([kocsma.lng, kocsma.lat])
          .addTo(mapRef.current);

        marker.getElement().addEventListener('click', () => {
          setSelectedKocsma(kocsma);
          mapRef.current.flyTo({
            center: [kocsma.lng, kocsma.lat],
            zoom: 16
          });
        });

        markersRef.current.push(marker);
      }
    });
  }, [kocsmak])

  const handleButtonClick = () => {
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    })
    setSelectedKocsma(null)
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

      {/* Információs panel */}
      <div className={`info-panel ${selectedKocsma ? 'open' : ''}`}>
        {selectedKocsma && (
          <>
            <button className="info-panel-close" onClick={() => setSelectedKocsma(null)}>
              &times;
            </button>
            
            <h2>{selectedKocsma.nev}</h2>
            <p><strong>Cím:</strong> {selectedKocsma.cim}</p>
            <p><strong>Nyitvatartás:</strong> {selectedKocsma.nyitvatartas}</p>
          </>
        )}
      </div>
    </>
  )
}

export default App