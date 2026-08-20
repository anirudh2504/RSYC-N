client/public/images — picture files used by the site
====================================================

Anything in this folder is served from "/images/". A file saved here as

    rao-shekha-ji.jpg

is reachable in the browser at

    /images/rao-shekha-ji.jpg


>>> SAVE THE PAINTING HERE <<<
------------------------------
The About page is already pointing at /images/rao-shekha-ji.jpg.

Save the portrait of Rao Shekha Ji into THIS folder with THAT exact filename
and it appears on the About page straight away. Nothing in the code needs to
change and the server does not need restarting — just refresh the page.

Until the file is there, the About page shows an empty frame with the path
written on it, so it is obvious what is missing.

The path is editable if you want a different filename:
Admin -> Club settings -> "The name we carry" -> "Portrait image".

  file name : rao-shekha-ji.jpg
  shape     : portrait, taller than wide, about 3:4
  size      : ~800px on the long edge is plenty


OTHER PICTURES
--------------
Member photos and event photos can live here too. Save them in this folder and
point at them as /images/<filename>.
