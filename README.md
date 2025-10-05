# embiggen-your-eyes
Do you ever see a satellite image of space and wish you could learn exactly what is in it? NASALinks provides an easy-to-use interface for you to explore maps of celestials bodies and learn directly from the source.

We took the next step of exploring satellite images from just viewing the map, to making it full interactive learning experience. Google Maps has a "space" feature that simply tells shows you a 3D map of a celestial body and where a feature may be, but we made NASALink as a tool to make the learning experience truly interactive.

The web app is created with Python code, HTML/CSS, and APIs. We took a creative approach to connecting the data together to tell a story about the selected feature instead of focusing on just one.

1. Took the satellite map tiles from NASA Space Treks and loaded it in with coordinates.

2. Overlayed and matched the coordinates of known geological features for each celestial body's using NASA USGS nomenclature data. Each feature has basic data such as name, type, coordinates, size, origin of name, and approval date.

3. Used customized data from multiple sources to construct a timeline of events for the feature sourced from NASA USGS data, NASA mission reports, and Wikipedia API.

4. Pulled relevant images from NASA Image API to show additional views of the feature from other satellite images. 

upload_image.16:48:53.482397
All together, the impact of this interactive experience to encourage exploration and learning beyond the surface map (pun intended). 

We did have to consider that some APIs wouldn't work because of issues with NASA websites at the time and had to adjust accordingly. 

Sources:
NASA Trek (WMTS)
NASA Image and Video Library API
NASA Lunar Reconnaissance Orbiter Camera
Wikipedia API
USGS APIs
