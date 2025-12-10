import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

// Firestore funkciók bővítése: deleteDoc és doc importálása a törléshez
import { db } from './firebase' 
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [21.62601, 47.53184]
const INITIAL_ZOOM = 14.01

function App() {
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const markersRef = useRef([])

  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  
  const [selectedKocsma, setSelectedKocsma] = useState(null)
  const [kocsmak, setKocsmak] = useState([])

  // State-ek a hozzáadáshoz
  const [isAddingMode, setIsAddingMode] = useState(false) 
  const [newLocation, setNewLocation] = useState(null)
  const [formData, setFormData] = useState({ nev: '', cim: '', nyitvatartas: '' }) 

  // Adatok lekérése
  const fetchKocsmak = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "kocsmak"));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() 
      }));
      setKocsmak(data);
    } catch (error) {
      console.error("Hiba az adatok lekérésekor:", error);
    }
  };

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

    // Kattintás esemény a térképen (új hely felvételéhez)
    mapRef.current.on('click', (e) => {
      if (window.isAddingModeGlobal) {
        const { lng, lat } = e.lngLat;
        setNewLocation({ lng, lat });
        window.isAddingModeGlobal = false; 
        setIsAddingMode(false); 
      }
    });

    fetchKocsmak();

    return () => {
      mapRef.current.remove()
    }
  }, []) 

  // Szinkronizáljuk a React state-et a globális változóval
  useEffect(() => {
    window.isAddingModeGlobal = isAddingMode;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = isAddingMode ? 'crosshair' : 'grab';
    }
  }, [isAddingMode]);

  // Markerek kezelése
  useEffect(() => {
    if (!mapRef.current || kocsmak.length === 0) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    kocsmak.forEach(kocsma => {
      if (kocsma.lat && kocsma.lng) {
        const marker = new mapboxgl.Marker()
          .setLngLat([kocsma.lng, kocsma.lat])
          .addTo(mapRef.current);

        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation(); 
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

  // Új hely mentése
  const handleSaveNewPlace = async () => {
    if (!formData.nev || !newLocation) return;

    try {
      await addDoc(collection(db, "kocsmak"), {
        nev: formData.nev,
        cim: formData.cim,
        nyitvatartas: formData.nyitvatartas,
        lat: newLocation.lat,
        lng: newLocation.lng
      });
      
      setNewLocation(null); 
      setFormData({ nev: '', cim: '', nyitvatartas: '' }); 
      fetchKocsmak(); 
    } catch (e) {
      console.error("Hiba mentéskor: ", e);
    }
  }

  // --- ÚJ: TÖRLÉS FUNKCIÓ ---
  const handleDeletePlace = async (id) => {
    if (confirm("Biztosan törölni szeretnéd ezt a kocsmát?")) {
      try {
        // Törlés a Firestore-ból az ID alapján
        await deleteDoc(doc(db, "kocsmak", id));
        
        // UI frissítése
        setSelectedKocsma(null);
        fetchKocsmak(); // Lista újratöltése
      } catch (e) {
        console.error("Hiba törléskor: ", e);
        alert("Hiba történt a törlés során!");
      }
    }
  }

  return (
    <>
      <div className="sidebar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      
      <button className='reset-button' onClick={handleButtonClick}>
        Reset
      </button>

      <button 
        className={`add-button ${isAddingMode ? 'active' : ''}`}
        onClick={() => setIsAddingMode(!isAddingMode)}
      >
        {isAddingMode ? 'Kattints a térképre!' : '+ Új hely'}
      </button>

      {newLocation && (
        <div className="add-form-panel">
          <h3>Új kocsma felvétele</h3>
          <input 
            placeholder="Név" 
            value={formData.nev}
            onChange={e => setFormData({...formData, nev: e.target.value})}
          />
          <input 
            placeholder="Cím" 
            value={formData.cim}
            onChange={e => setFormData({...formData, cim: e.target.value})}
          />
          <input 
            placeholder="Nyitvatartás (pl. 12:00-22:00)" 
            value={formData.nyitvatartas}
            onChange={e => setFormData({...formData, nyitvatartas: e.target.value})}
          />
          <div className="form-buttons">
            <button className="btn-save" onClick={handleSaveNewPlace}>Mentés</button>
            <button className="btn-cancel" onClick={() => setNewLocation(null)}>Mégse</button>
          </div>
        </div>
      )}

      <div id='map-container' ref={mapContainerRef} />

      <div className={`info-panel ${selectedKocsma ? 'open' : ''}`}>
        {selectedKocsma && (
          <>
            <button className="info-panel-close" onClick={() => setSelectedKocsma(null)}>
              &times;
            </button>
            
            <h2>{selectedKocsma.nev}</h2>
            <p><strong>Cím:</strong> {selectedKocsma.cim}</p>
            <p><strong>Nyitvatartás:</strong> {selectedKocsma.nyitvatartas}</p>
            
            {/* ÚJ: Törlés gomb az információs panel alján */}
            <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px'}}>
              <button 
                className="btn-cancel" 
                style={{backgroundColor: '#dc3545', width: '100%'}}
                onClick={() => handleDeletePlace(selectedKocsma.id)}
              >
                Törlés
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default App