This file:

- Wires together search by city and by geolocation
- Renders current conditions + 5‑day forecast
- Supports unit toggling (imperial ⇄ metric) with instant local conversion
- Saves/loads favorite locations to localStorage
- Shows moon phase (note: we compute illumination here from `fraction`)

"Use Client":
It is a directive (like "use strict" in plain JS) that tells Next.JS:
-This is a Client Component and it should run only in the browser.
-They are rendered on the server
-They can safely access databases, API keys ect.
Sometimes you need browser-only features like :
-useState, useEffect, useContext
-Event Handlers(onClick, onChange)
-Access to a window or document

Weather + Forecast domain helpers
install tslib: Bash command: npm install tslib --save
These are exported functions from the "lib" folder that are imported to the component side with is "app/page.tsx"

The Idea of "state"
-More or less variables that react watches
-state = the memory of a component
-It's data that belongs to that component and can change over time
-When state changes, React re-renders the component to reflect new values in the UI.
