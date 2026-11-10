/* ==========================================================================
   LOGIN BACKGROUND SLIDESHOW  -  edit this file to use your own pictures
   ==========================================================================

   HOW TO CHANGE THE PICTURES
     1. Copy your photos into the  static/images/  folder.
     2. Type their file names in the list below (keep the quotes and commas).
        Add or remove lines as you like - 4 pictures works well.
     3. Refresh the page.

   The two easiest ways:
     - Keep the names slide1.jpg ... slide4.jpg and just replace those 4 files, or
     - Put any file names you want in the list.

   TIPS
     - Wide (landscape) photos around 1600 x 900 pixels or bigger look best.
     - Keep each file under about 500 KB so the login page loads fast.
     - If a file name is wrong or the file is missing, it is skipped
       (nothing breaks). If none can be loaded, a plain background is used.
*/
const BACKGROUND_SLIDESHOW = {
  images: [
    'static/images/slide1.jpg',
    'static/images/slide2.jpg',
    'static/images/slide3.jpg',
    'static/images/slide4.jpg',
  ],

  intervalMs: 6000, // how long each picture stays on screen (6000 = 6 seconds)
  fadeMs: 150,     // how long the fade between pictures takes
  darkness: 0.35,   // dark layer over the pictures so text stays readable: 0 = none, 1 = black
};
