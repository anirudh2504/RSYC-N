client/public — files served at the site root
=============================================

Anything in this folder is served as-is from "/". A file saved here as

    logo.jpeg

is reachable in the browser at

    /logo.jpeg


>>> TWO FILES TO SAVE HERE <<<
------------------------------

1. THE CLUB LOGO          ->  client/public/logo.jpeg

   Used in every place the club mark appears, all from one file:
     - the top bar, on every page
     - the About page heading
     - the unlock screen and the admin sign-in screen
     - the "request submitted" screen
     - the browser tab icon, and the icon a phone shows when the site is
       added to the home screen

   Save it and all of those change at once. No code edit, no restart —
   just refresh the page.

   Until it exists, the site falls back to the drawn crest, so nothing ever
   looks broken.

     file name : logo.jpeg   (exactly this — lower case, .jpeg not .jpg)
     shape     : square works best, since it sits in a 34px box in the top bar
     size      : 400x400 is plenty


2. THE PORTRAIT OF RAO SHEKHA JI  ->  client/public/images/rao-shekha-ji.jpg

   See the README inside the images folder.


NOTES
-----
The logo path is set once in client/src/components/Ornaments.jsx as LOGO_SRC.
Change it there if you ever want a different filename.

If you save the logo and still see the old crest, the browser has cached the
failed request — hard refresh with Ctrl+Shift+R.
