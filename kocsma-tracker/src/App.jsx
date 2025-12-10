import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

// Firestore funkciók bővítése: updateDoc importálása a szerkesztéshez
import { db } from './firebase' 
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore'

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

  // State-ek a hozzáadáshoz és szerkesztéshez
  const [isAddingMode, setIsAddingMode] = useState(false) 
  const [isEditing, setIsEditing] = useState(false) // Szerkesztünk éppen?
  const [editingId, setEditingId] = useState(null) // Melyik ID-t szerkesztjük?
  
  // Űrlap adatok (közös a hozzáadáshoz és szerkesztéshez)
  const [formData, setFormData] = useState({ nev: '', cim: '', nyitvatartasStart: '12:00', nyitvatartasEnd: '00:00' }) 
  const [formLocation, setFormLocation] = useState(null) // Koordináták az űrlaphoz

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
        setFormLocation({ lng, lat }); // Beállítjuk az új hely koordinátáit
        setIsEditing(false); // Ez biztosan új hozzáadás, nem szerkesztés
        setFormData({ nev: '', cim: '', nyitvatartasStart: '12:00', nyitvatartasEnd: '00:00' }); // Üres űrlap
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
          // Bezárjuk az űrlapot ha nyitva lenne, hogy ne zavarjon
          setFormLocation(null);
          
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
    setFormLocation(null)
  }

  // --- MENTÉS (Létrehozás VAGY Frissítés) ---
  const handleSave = async () => {
    if (!formData.nev || !formLocation) return;

    const fullNyitvatartas = `${formData.nyitvatartasStart} - ${formData.nyitvatartasEnd}`;

    try {
      if (isEditing && editingId) {
        // --- SZERKESZTÉS ÁGA ---
        const kocsmaRef = doc(db, "kocsmak", editingId);
        await updateDoc(kocsmaRef, {
          nev: formData.nev,
          cim: formData.cim,
          nyitvatartas: fullNyitvatartas,
          // A koordinátákat is frissíthetnénk, de most feltételezzük, hogy az nem változik szerkesztéskor
          // Ha szeretnéd, hogy a marker áthelyezhető legyen, az bonyolultabb logika
        });
        console.log("Sikeres frissítés!");
        setSelectedKocsma(null); // Bezárjuk az infó panelt, mert frissül a lista
      } else {
        // --- ÚJ HOZZÁADÁS ÁGA ---
        await addDoc(collection(db, "kocsmak"), {
          nev: formData.nev,
          cim: formData.cim,
          nyitvatartas: fullNyitvatartas,
          lat: formLocation.lat,
          lng: formLocation.lng
        });
        console.log("Sikeres létrehozás!");
      }
      
      // Takarítás
      setFormLocation(null); 
      setEditingId(null);
      setIsEditing(false);
      setFormData({ nev: '', cim: '', nyitvatartasStart: '12:00', nyitvatartasEnd: '00:00' }); 
      fetchKocsmak(); 
    } catch (e) {
      console.error("Hiba mentéskor: ", e);
    }
  }

  // Törlés funkció
  const handleDeletePlace = async (id) => {
    if (confirm("Biztosan törölni szeretnéd ezt a kocsmát?")) {
      try {
        await deleteDoc(doc(db, "kocsmak", id));
        setSelectedKocsma(null);
        fetchKocsmak(); 
      } catch (e) {
        console.error("Hiba törléskor: ", e);
        alert("Hiba történt a törlés során!");
      }
    }
  }

  // --- SZERKESZTÉS INDÍTÁSA ---
  const startEditing = (kocsma) => {
    // Kinyerjük az időpontokat a stringből (pl. "12:00 - 02:00")
    let start = '12:00';
    let end = '00:00';
    if (kocsma.nyitvatartas && kocsma.nyitvatartas.includes(' - ')) {
      const parts = kocsma.nyitvatartas.split(' - ');
      start = parts[0];
      end = parts[1];
    }

    setFormData({
      nev: kocsma.nev,
      cim: kocsma.cim,
      nyitvatartasStart: start,
      nyitvatartasEnd: end
    });
    setFormLocation({ lat: kocsma.lat, lng: kocsma.lng }); // Csak hogy legyen érvényes location az űrlaphoz
    setEditingId(kocsma.id);
    setIsEditing(true);
    
    // Bezárjuk az infó panelt és megnyitjuk az űrlapot
    setSelectedKocsma(null);
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
        onClick={() => {
          setIsAddingMode(!isAddingMode);
          // Ha épp szerkesztettünk valamit, lépjünk ki belőle
          if (formLocation) {
            setFormLocation(null);
            setIsEditing(false);
          }
        }}
      >
        {isAddingMode ? 'Kattints a térképre!' : '+ Új hely'}
      </button>

      {/* ŰRLAP (Közös a hozzáadáshoz és szerkesztéshez) */}
      {formLocation && (
        <div className="add-form-panel">
          <h3>{isEditing ? 'Kocsma szerkesztése' : 'Új kocsma felvétele'}</h3>
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
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
            <label style={{fontSize: '12px', color: '#666'}}>Nyitvatartás:</label>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <input 
                type="time" 
                value={formData.nyitvatartasStart}
                onChange={e => setFormData({...formData, nyitvatartasStart: e.target.value})}
                style={{flex: 1}}
              />
              <span>-</span>
              <input 
                type="time" 
                value={formData.nyitvatartasEnd}
                onChange={e => setFormData({...formData, nyitvatartasEnd: e.target.value})}
                style={{flex: 1}}
              />
            </div>
          </div>

          <div className="form-buttons">
            <button className="btn-save" onClick={handleSave}>
              {isEditing ? 'Frissítés' : 'Mentés'}
            </button>
            <button className="btn-cancel" onClick={() => {
              setFormLocation(null);
              setIsEditing(false);
              setEditingId(null);
            }}>Mégse</button>
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
            
            <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px', display: 'flex', gap: '10px'}}>
              {/* ÚJ: Szerkesztés gomb */}
              <button 
                className="btn-save" // Újrahasznosítjuk a stílust
                style={{backgroundColor: '#ffc107', color: '#000', flex: 1}}
                onClick={() => startEditing(selectedKocsma)}
              >
                Szerkesztés
              </button>

              <button 
                className="btn-cancel" 
                style={{backgroundColor: '#dc3545', flex: 1}}
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