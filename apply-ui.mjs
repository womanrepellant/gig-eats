
import fs from "node:fs";

const file = "app/discover.tsx";
const style = "app/premium-theme.css";

if (!fs.existsSync(file) || !fs.existsSync(style)) {
  throw Error("Open the snackggies project folder first.");
}

let code = fs.readFileSync(file, "utf8");
let css = fs.readFileSync(style, "utf8");

if (code.includes("snaggies-filter-panel")) {
  console.log("This update is already installed.");
  process.exit(0);
}

function change(oldText, newText) {
  if (!code.includes(oldText)) {
    throw Error("Code has changed. No files modified: " + oldText.slice(0, 65));
  }
  code = code.replace(oldText, newText);
}

// Add visibility state for the filter panel.
change(
  "const[page,setPage]=useState<",
  "const[filtersOpen,setFiltersOpen]=useState(true);\n const[page,setPage]=useState<"
);

// Expand the map when filters are hidden.
change(
  'className={`main map-main ${showMap?"map-mode":"list-mode"}`}',
  'className={`main map-main ${showMap?"map-mode":"list-mode"} ${!filtersOpen&&showMap?"filters-hidden":""}`}'
);

// Make the top Filters button toggle the left column.
change(
  'onClick={()=>setModal({kind:"filters"})}><SlidersHorizontal size={16}/>Filters',
  'onClick={()=>{if(window.innerWidth<=600)setModal({kind:"filters"});else{setFiltersOpen(v=>!v);setShowMap(true)}}} aria-expanded={filtersOpen}><SlidersHorizontal size={16}/>{filtersOpen?"Hide filters":"Show filters"}'
);

// Remove the old quick-filter chips.


// Add real filters above the restaurant results.
change(
  '<div className="results-panel" ref={listPanel}><div className="panel-heading">',
  `<div className="results-panel" ref={listPanel}>
  <div className="snaggies-filter-panel">
    <div className="snaggies-filter-title">
      <div>
        <small>MAKE IT YOURS</small>
        <h2>Find your food</h2>
      </div>
      <button
        onClick={()=>{setFiltersOpen(false);setShowMap(true)}}
        aria-label="Hide filter panel"
      >
        <X size={17}/>
      </button>
    </div>

    <label>
      Cuisine
      <select
        value={filters.cuisines.length===1?filters.cuisines[0]:""}
        onChange={e=>setFilters({
          ...filters,
          cuisines:e.target.value?[e.target.value]:[]
        })}
      >
        <option value="">All cuisines</option>
        {TYPES.map(t=>
          <option key={t} value={t}>{t}</option>
        )}
      </select>
    </label>

    <label>
      Minimum Aggie rating
      <select
        value={filters.minStars}
        onChange={e=>setFilters({
          ...filters,
          minStars:Number(e.target.value)
        })}
      >
        <option value={0}>Any rating</option>
        <option value={3}>3+ stars</option>
        <option value={4}>4+ stars</option>
        <option value={4.5}>4.5+ stars</option>
      </select>
    </label>

    <label className="snaggies-check">
      <input
        type="checkbox"
        checked={filters.menuOnly}
        onChange={e=>setFilters({
          ...filters,
          menuOnly:e.target.checked
        })}
      />
      Has a direct menu
    </label>

    <div className="snaggies-filter-actions">
      <button onClick={()=>setModal({kind:"filters"})}>
        More filters ({filterCount})
      </button>
      <button onClick={clear}>Clear all</button>
    </div>
  </div>
  <div className="panel-heading">`
);

// Add the new design styles.
css += String.raw`

/* Snaggies: left filters and expanding map */

.map-search .shortcut-row {
  display: none;
}

.map-main.filters-hidden .map-workspace {
  grid-template-columns: minmax(0, 1fr);
}

.map-main.filters-hidden .results-panel {
  display: none;
}

.map-main.filters-hidden .map-workspace > .spot-map {
  grid-column: 1;
}

.snaggies-filter-panel {
  padding: 18px;
  margin-bottom: 15px;
  border: 1px solid #624256;
  border-radius: 15px;
  background: #201c27;
  color: #f4e9ef;
}

.snaggies-filter-title {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.snaggies-filter-title small {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: #d49ab0;
}

.snaggies-filter-title h2 {
  font: normal 22px Georgia, serif;
  margin-top: 5px;
}

.snaggies-filter-title button {
  border: 1px solid #65475a;
  border-radius: 8px;
  padding: 7px;
  color: #f0c9d8;
}

.snaggies-filter-panel > label:not(.snaggies-check) {
  display: grid;
  gap: 7px;
  font-size: 12px;
  margin: 12px 0;
  color: #e1c7d3;
}

.snaggies-filter-panel select {
  width: 100%;
  min-height: 40px;
  background: #15141d;
  border: 1px solid #5e4659;
  border-radius: 9px;
  color: #fff;
  padding: 10px;
}

.snaggies-check {
  display: flex;
  gap: 9px;
  align-items: center;
  font-size: 12px;
  margin: 16px 0;
  color: #ded1d9;
}

.snaggies-check input {
  accent-color: #b25c7a;
}

.snaggies-filter-actions {
  display: flex;
  gap: 9px;
  border-top: 1px solid #493644;
  padding-top: 15px;
}

.snaggies-filter-actions button {
  flex: 1;
  padding: 10px;
  border-radius: 9px;
  font-size: 11px;
  background: #69324a;
  color: white;
}

.snaggies-filter-actions button + button {
  background: #332631;
  border: 1px solid #695065;
}

/* Ocean-blue See-Food page */

.theme-page .theme-hero {
  background:
    radial-gradient(circle at 85% 15%, #3cd9d64d, transparent 35%),
    linear-gradient(125deg, #09283d, #0b556e 58%, #148e96);
  border: 1px solid #4e9aa9;
  box-shadow: 0 18px 40px #001b2f80;
}

.theme-page .theme-hero::after {
  content: "≈";
  color: #ddffff;
  font-size: 190px;
  opacity: .16;
  top: -20px;
}

.theme-page .theme-kicker {
  color: #b5fcf4;
}

.theme-page .theme-hero p {
  color: #c9f1f2;
}

.theme-page .theme-hero-action {
  background: #e1fffa;
  color: #064e5d;
}

.theme-page .theme-card {
  background: linear-gradient(150deg, #15394a, #0c2735);
  border-color: #326f80;
}

.theme-page .theme-card-icon {
  background: #155a68;
  color: #b3fff4;
}

.theme-page .theme-card h3,
.theme-page .theme-heading h2 {
  color: #edffff;
}

.theme-page .theme-card p,
.theme-page .theme-card small {
  color: #b9e1e7;
}

.theme-page .theme-card-actions button,
.theme-page .theme-card-actions a {
  color: #9bf2ed;
}

@media (max-width: 600px) {
  .snaggies-filter-panel {
    display: none;
  }

  .map-main.filters-hidden .results-panel {
    display: block;
  }

  .map-main.filters-hidden .map-workspace {
    display: flex;
    flex-direction: column;
  }
}
`;

fs.writeFileSync(file, code);
fs.writeFileSync(style, css);

console.log("Done! Refresh http://localhost:3000");
