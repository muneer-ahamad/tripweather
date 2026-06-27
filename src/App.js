import { useState, useRef, useEffect } from "react";

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const OTM_KEY = "5ae2e3f221c38a28845f05b6780df48d720d8fb5dccacec8f8944769";
const UNSPLASH_KEY = "58IiOc8fAyIqiFn0OGY1y_QrtszqXa8f3Uuph6RVXxk";

const WMO_CODES = {
  0:{label:"Clear sky",icon:"ti-sun"},1:{label:"Mainly clear",icon:"ti-sun"},
  2:{label:"Partly cloudy",icon:"ti-cloud"},3:{label:"Overcast",icon:"ti-cloud-filled"},
  45:{label:"Foggy",icon:"ti-mist"},48:{label:"Icy fog",icon:"ti-mist"},
  51:{label:"Light drizzle",icon:"ti-cloud-drizzle"},53:{label:"Drizzle",icon:"ti-cloud-drizzle"},
  55:{label:"Heavy drizzle",icon:"ti-cloud-drizzle"},61:{label:"Light rain",icon:"ti-cloud-rain"},
  63:{label:"Rain",icon:"ti-cloud-rain"},65:{label:"Heavy rain",icon:"ti-cloud-storm"},
  71:{label:"Light snow",icon:"ti-snowflake"},73:{label:"Snow",icon:"ti-snowflake"},
  75:{label:"Heavy snow",icon:"ti-snowflake"},80:{label:"Rain showers",icon:"ti-cloud-rain"},
  81:{label:"Rain showers",icon:"ti-cloud-rain"},82:{label:"Violent showers",icon:"ti-cloud-storm"},
  95:{label:"Thunderstorm",icon:"ti-bolt"},99:{label:"Thunderstorm w/ hail",icon:"ti-bolt"},
};
const wmo = c => WMO_CODES[c] || {label:"Unknown",icon:"ti-cloud-question"};
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getTravelTip(code, maxTemp) {
  if ([0,1].includes(code) && maxTemp>20) return {text:"Perfect weather for exploring! Great time to visit.",icon:"ti-circle-check",color:"#86efac"};
  if ([2,3].includes(code)) return {text:"Mild and cloudy — comfortable for sightseeing.",icon:"ti-info-circle",color:"#7dd3fc"};
  if ([61,63,80,81].includes(code)) return {text:"Rain expected — pack an umbrella and waterproof gear.",icon:"ti-umbrella",color:"#fcd34d"};
  if ([65,82,95,99].includes(code)) return {text:"Heavy weather alert — consider rescheduling outdoor plans.",icon:"ti-alert-triangle",color:"#fca5a5"};
  if ([71,73,75].includes(code)) return {text:"Snow possible — dress warm and check road conditions.",icon:"ti-snowflake",color:"#bae6fd"};
  if (maxTemp>35) return {text:"Very hot! Stay hydrated and visit in the morning or evening.",icon:"ti-thermometer-sun",color:"#fdba74"};
  return {text:"Decent travel weather — check daily forecasts for details.",icon:"ti-map-pin",color:"#c4b5fd"};
}

const glass = {
  background:"rgba(15,32,43,0.55)",
  backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",
  border:"1px solid rgba(255,255,255,0.18)",
  borderRadius:16,padding:"1.25rem",marginBottom:12,color:"#fff",
};
const metaBox = {
  background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
  border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 12px",color:"#fff",
};

function kindToIcon(kinds="") {
  if (kinds.includes("beaches")) return "ti-waves";
  if (kinds.includes("museums")) return "ti-building-museum";
  if (kinds.includes("religion")||kinds.includes("temple")) return "ti-building-church";
  if (kinds.includes("parks")||kinds.includes("nature")) return "ti-trees";
  if (kinds.includes("historic")) return "ti-building-monument";
  if (kinds.includes("food")||kinds.includes("restaurant")) return "ti-tools-kitchen-2";
  if (kinds.includes("shops")) return "ti-shopping-bag";
  return "ti-map-pin";
}
function kindToLabel(kinds="") {
  if (kinds.includes("beaches")) return "Beach";
  if (kinds.includes("museums")) return "Museum";
  if (kinds.includes("religion")||kinds.includes("temple")) return "Religious Site";
  if (kinds.includes("parks")||kinds.includes("nature")) return "Nature";
  if (kinds.includes("historic")) return "Historic";
  if (kinds.includes("food")) return "Food";
  if (kinds.includes("shops")) return "Shopping";
  return "Attraction";
}
function rateToStars(rate=0) {
  const n = Math.min(Math.round(rate), 3);
  return "★".repeat(n) + "☆".repeat(3-n);
}

// ── Map Modal ──────────────────────────────────────────────────────
function MapModal({ onClose, onPinConfirm }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [pinned, setPinned] = useState(null);

  useEffect(() => {
    if (leafletMap.current) return;
    const L = window.L;
    if (!L) return;
    const map = L.map(mapRef.current, { center:[20,0], zoom:2 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap" }).addTo(map);
    const pinIcon = L.divIcon({
      className:"",
      html:`<div style="width:28px;height:28px;background:#0ea5e9;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize:[28,28],iconAnchor:[14,28],
    });
    map.on("click", async (e) => {
      const {lat,lng} = e.latlng;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat,lng],{icon:pinIcon}).addTo(map);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      const name = data.address?.city||data.address?.town||data.address?.village||data.address?.county||"Selected location";
      const country = data.address?.country||"";
      setPinned({lat,lon:lng,name,country,display:`${name}${country?", "+country:""}`});
    });
    leafletMap.current = map;
  }, []);

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:720,background:"#0f2027",borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,0.15)",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <div>
            <span style={{fontWeight:600,fontSize:16,color:"#fff"}}>Pick a location</span>
            <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.5)"}}>Click anywhere on the map to drop a pin</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:18}}>
            <i className="ti ti-x"></i>
          </button>
        </div>
        <div ref={mapRef} style={{height:420,width:"100%"}}></div>
        <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:14,color:pinned?"#7dd3fc":"rgba(255,255,255,0.4)"}}>
            {pinned?<><i className="ti ti-map-pin" style={{marginRight:6}}></i>{pinned.display}</>:"No location pinned yet"}
          </span>
          <button disabled={!pinned} onClick={()=>{onPinConfirm(pinned);onClose();}}
            style={{padding:"9px 22px",borderRadius:10,border:"none",cursor:pinned?"pointer":"not-allowed",background:pinned?"#0ea5e9":"rgba(255,255,255,0.1)",color:pinned?"#fff":"rgba(255,255,255,0.3)",fontWeight:600,fontSize:14,boxShadow:pinned?"0 4px 16px rgba(14,165,233,0.4)":"none"}}>
            Get Weather <i className="ti ti-arrow-right" style={{marginLeft:4}}></i>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [bgUrl, setBgUrl] = useState("");
  const [bgFade, setBgFade] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id="leaflet-css";link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!window.L) {
      const s = document.createElement("script");
      s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.head.appendChild(s);
    }
  }, []);

  const fetchBg = async (cityName, countryName) => {
    const q = encodeURIComponent(`${cityName} landmark`);
    try {
      const res = await fetch(`https://api.unsplash.com/photos/random?query=${q}&orientation=landscape&client_id=${UNSPLASH_KEY}`);
      const data = await res.json();
      const url = data?.urls?.regular;
      if (url) {
        setBgFade(false);
        setTimeout(() => { setBgUrl(url); setBgFade(true); }, 100);
      }
    } catch {}
  };

  const searchGeo = async (q) => {
    if (!q||q.length<2){setSuggestions([]);return[];}
    const res = await fetch(`${GEO_API}?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
    const data = await res.json();
    const results = data.results||[];
    setSuggestions(results);
    return results;
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(()=>searchGeo(e.target.value),350);
  };

  const fetchPlaces = async (lat,lon) => {
    setPlacesLoading(true);
    try {
      const r1 = await fetch(`https://api.opentripmap.com/0.1/en/places/radius?radius=5000&lon=${lon}&lat=${lat}&kinds=interesting_places&limit=8&format=json&apikey=${OTM_KEY}`);
      const data = await r1.json();
      const items = Array.isArray(data)?data:(data.features||[]);
      const detailed = await Promise.all(items.slice(0,8).map(async(p)=>{
        const xid = p.properties?.xid||p.xid;
        if(!xid) return null;
        const r2 = await fetch(`https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OTM_KEY}`);
        const d = await r2.json();
        if(!d.name) return null;
        return {
          name:d.name,
          kinds:d.kinds||"",
          desc:d.wikipedia_extracts?.text?.slice(0,90)||d.info?.descr?.slice(0,90)||"A notable place worth visiting.",
          icon:kindToIcon(d.kinds||""),
          label:kindToLabel(d.kinds||""),
          rate:d.rate||0,
          img:d.preview?.source||null,
        };
      }));
      setPlaces(detailed.filter(Boolean));
    } catch { setPlaces([]); }
    setPlacesLoading(false);
  };

  const fetchWeather = async (loc) => {
    setLoading(true);setError("");setWeather(null);setPlaces([]);setSuggestions([]);
    fetchBg(loc.name, loc.country);
    try {
      const res = await fetch(`${WEATHER_API}?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`);
      const data = await res.json();
      setWeather(data);
      await fetchPlaces(loc.lat,loc.lon);
    } catch { setError("Could not fetch weather. Please try again."); }
    setLoading(false);
  };

  const selectSuggestion = (s) => {
    const loc={lat:s.latitude,lon:s.longitude,name:s.name,country:s.country};
    setLocation(loc);setQuery(`${s.name}, ${s.country}`);fetchWeather(loc);
  };

  const detectLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      const {latitude:lat,longitude:lon}=pos.coords;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      const name=data.address?.city||data.address?.town||data.address?.village||"Your location";
      const country=data.address?.country||"";
      setQuery(`${name}, ${country}`);
      const loc={lat,lon,name,country};
      setLocation(loc);setGeoLoading(false);fetchWeather(loc);
    },()=>{setError("Location access denied.");setGeoLoading(false);});
  };

  const cur = weather?.current;
  const daily = weather?.daily;
  const tip = cur&&daily?getTravelTip(cur.weathercode,Math.round(daily.temperature_2m_max[0])):null;

  return (
    <div style={{minHeight:"100vh",fontFamily:"'Segoe UI',sans-serif",color:"#fff",padding:"0 0 3rem",position:"relative",overflow:"hidden"}}>

      {/* Background */}
      <div style={{position:"fixed",inset:0,zIndex:0,background:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",transition:"opacity 0.8s ease",}}></div>
      {bgUrl && (
        <div style={{
          position:"fixed",inset:0,zIndex:1,
          backgroundImage:`url(${bgUrl})`,
          backgroundSize:"cover",backgroundPosition:"center",
          opacity:bgFade?1:0,
          transition:"opacity 1.2s ease",
        }}></div>
      )}
      {/* dark tint over bg image only */}
      {bgUrl && <div style={{position:"fixed",inset:0,zIndex:2,background:"rgba(0,0,0,0.35)",transition:"opacity 1s ease",opacity:bgFade?1:0}}></div>}

      {showMap && (
        <div style={{position:"relative",zIndex:1000}}>
          <MapModal onClose={()=>setShowMap(false)} onPinConfirm={(loc)=>{setLocation(loc);setQuery(loc.display);fetchWeather(loc);}}/>
        </div>
      )}

      {/* All content above bg */}
      <div style={{position:"relative",zIndex:3}}>

        {/* Hero */}
        <div style={{padding:"2.5rem 1rem 2rem",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}>
            <i className="ti ti-world" style={{fontSize:28,color:"#7dd3fc"}}></i>
            <span style={{fontSize:26,fontWeight:600,letterSpacing:0.5,textShadow:"0 2px 8px rgba(0,0,0,0.5)"}}>TripWeather</span>
          </div>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.75)",margin:"0 0 1.5rem",textShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>Search any destination to plan your trip around the weather</p>

          <div style={{maxWidth:600,margin:"0 auto",display:"flex",gap:8,position:"relative"}}>
            <div style={{flex:1,position:"relative"}}>
              <i className="ti ti-search" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:18,color:"#94a3b8",zIndex:1}}></i>
              <input value={query} onChange={handleInput} placeholder="Search city or destination..."
                onKeyDown={async e=>{
                  if(e.key==="Enter"){
                    if(suggestions.length)selectSuggestion(suggestions[0]);
                    else{const r=await searchGeo(query);if(r.length)selectSuggestion(r[0]);}
                  }
                }}
                style={{width:"100%",boxSizing:"border-box",height:52,paddingLeft:44,paddingRight:16,fontSize:15,borderRadius:12,background:"rgba(255,255,255,0.95)",border:"none",outline:"none",color:"#1e293b",boxShadow:"0 4px 24px rgba(0,0,0,0.3)"}}
              />
              {suggestions.length>0&&(
                <div style={{position:"absolute",top:"110%",left:0,right:0,background:"rgba(10,20,30,0.97)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,zIndex:20,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
                  {suggestions.map((s,i)=>(
                    <div key={i} onClick={()=>selectSuggestion(s)}
                      style={{padding:"12px 16px",fontSize:14,cursor:"pointer",display:"flex",justifyContent:"space-between",borderBottom:i<suggestions.length-1?"1px solid rgba(255,255,255,0.08)":"none",color:"#f1f5f9"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span>{s.name}{s.admin1?`, ${s.admin1}`:""}</span>
                      <span style={{color:"rgba(255,255,255,0.45)",fontSize:13}}>{s.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={async()=>{if(suggestions.length)selectSuggestion(suggestions[0]);else{const r=await searchGeo(query);if(r.length)selectSuggestion(r[0]);}}}
              style={{height:52,padding:"0 18px",borderRadius:12,background:"#0ea5e9",border:"none",cursor:"pointer",color:"#fff",fontSize:15,fontWeight:500,boxShadow:"0 4px 16px rgba(14,165,233,0.4)",whiteSpace:"nowrap"}}>
              Search
            </button>
            <button onClick={()=>setShowMap(true)} title="Pick on map"
              style={{height:52,padding:"0 16px",borderRadius:12,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",cursor:"pointer",color:"#fff",fontSize:14,fontWeight:500,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
              <i className="ti ti-map-2" style={{fontSize:18}}></i> Map
            </button>
            <button onClick={detectLocation} title="Detect my location"
              style={{height:52,width:52,borderRadius:12,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",cursor:"pointer",color:"#fff",fontSize:20,backdropFilter:"blur(8px)"}}>
              {geoLoading?<i className="ti ti-loader"></i>:<i className="ti ti-current-location"></i>}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{maxWidth:680,margin:"0 auto",padding:"0 1rem"}}>
          {error&&<p style={{color:"#fca5a5",fontSize:14,textAlign:"center"}}>{error}</p>}
          {loading&&<p style={{textAlign:"center",color:"rgba(255,255,255,0.7)",fontSize:14,marginTop:"2rem"}}><i className="ti ti-loader" style={{fontSize:18}}></i> Fetching weather...</p>}

          {weather&&cur&&daily&&(
            <div>
              {/* Current weather */}
              <div style={glass}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                  <div>
                    <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.6)"}}>{location?.country}</p>
                    <h3 style={{margin:"2px 0 4px",fontSize:22,fontWeight:600}}>{location?.name}</h3>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <i className={`ti ${wmo(cur.weathercode).icon}`} style={{fontSize:18,color:"#7dd3fc"}}></i>
                      <span style={{fontSize:14,color:"rgba(255,255,255,0.75)"}}>{wmo(cur.weathercode).label}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{margin:0,fontSize:48,fontWeight:600,lineHeight:1}}>{Math.round(cur.temperature_2m)}°C</p>
                    <p style={{margin:"4px 0 0",fontSize:13,color:"rgba(255,255,255,0.6)"}}>Feels like {Math.round(cur.apparent_temperature)}°C</p>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8,marginTop:16}}>
                  {[
                    {icon:"ti-droplet",label:"Humidity",val:`${cur.relative_humidity_2m}%`},
                    {icon:"ti-wind",label:"Wind",val:`${Math.round(cur.wind_speed_10m)} km/h`},
                    {icon:"ti-thermometer",label:"High",val:`${Math.round(daily.temperature_2m_max[0])}°C`},
                    {icon:"ti-thermometer-minus",label:"Low",val:`${Math.round(daily.temperature_2m_min[0])}°C`},
                  ].map((m,i)=>(
                    <div key={i} style={metaBox}>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginBottom:2}}><i className={`ti ${m.icon}`} style={{marginRight:4}}></i>{m.label}</div>
                      <div style={{fontSize:16,fontWeight:600}}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Travel tip */}
              {tip&&(
                <div style={{...glass,display:"flex",alignItems:"center",gap:10,padding:"12px 16px"}}>
                  <i className={`ti ${tip.icon}`} style={{fontSize:20,color:tip.color,flexShrink:0}}></i>
                  <span style={{fontSize:14}}>{tip.text}</span>
                </div>
              )}

              {/* 5-day forecast */}
              <div style={{marginBottom:12}}>
                <p style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.55)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>5-day forecast</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                  {daily.weathercode.map((code,i)=>{
                    const d=new Date();d.setDate(d.getDate()+i);
                    return(
                      <div key={i} style={{...metaBox,textAlign:"center",padding:"10px 6px"}}>
                        <p style={{margin:"0 0 4px",fontSize:12,color:"rgba(255,255,255,0.55)"}}>{i===0?"Today":DAYS[d.getDay()]}</p>
                        <i className={`ti ${wmo(code).icon}`} style={{fontSize:22,color:"#7dd3fc"}}></i>
                        <p style={{margin:"6px 0 2px",fontSize:14,fontWeight:600}}>{Math.round(daily.temperature_2m_max[i])}°</p>
                        <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.55)"}}>{Math.round(daily.temperature_2m_min[i])}°</p>
                        {daily.precipitation_probability_max[i]>20&&(
                          <p style={{margin:"4px 0 0",fontSize:11,color:"#7dd3fc"}}><i className="ti ti-droplet" style={{fontSize:11}}></i> {daily.precipitation_probability_max[i]}%</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Places */}
              <div>
                <p style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.55)",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>
                  <i className="ti ti-map-2" style={{marginRight:6}}></i>Places to visit near {location?.name}
                </p>
                {placesLoading&&<p style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}><i className="ti ti-loader" style={{marginRight:6}}></i>Loading nearby places...</p>}
                {!placesLoading&&places.length===0&&<p style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>No notable places found nearby.</p>}

                {/* Horizontal scroll row */}
                <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
                  {places.map((p,i)=>(
                    <div key={i} style={{
                      minWidth:180,maxWidth:180,
                      background:"rgba(15,32,43,0.6)",
                      backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
                      border:"1px solid rgba(255,255,255,0.18)",
                      borderRadius:14,overflow:"hidden",flexShrink:0,
                      boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
                    }}>
                      {p.img&&(
                        <img src={p.img} alt={p.name}
                          style={{width:"100%",height:110,objectFit:"cover",display:"block"}}
                          onError={e=>e.target.style.display="none"}
                        />
                      )}
                      <div style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <i className={`ti ${p.icon}`} style={{fontSize:14,color:"#7dd3fc",flexShrink:0}}></i>
                          <span style={{fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</span>
                        </div>
                        <span style={{display:"inline-block",fontSize:10,background:"rgba(14,165,233,0.25)",border:"1px solid rgba(14,165,233,0.4)",borderRadius:20,padding:"2px 8px",color:"#7dd3fc",marginBottom:5}}>{p.label}</span>
                        {p.rate>0&&<p style={{margin:"0 0 4px",fontSize:12,color:"#fbbf24",letterSpacing:1}}>{rateToStars(p.rate)}</p>}
                        <p style={{margin:0,fontSize:11.5,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>{p.desc}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!weather&&!loading&&(
            <div style={{textAlign:"center",marginTop:"3rem",color:"rgba(255,255,255,0.5)"}}>
              <i className="ti ti-plane-departure" style={{fontSize:42,display:"block",marginBottom:12}}></i>
              <p style={{fontSize:14}}>Search a city or drop a pin on the map to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}