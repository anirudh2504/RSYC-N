client/public — files served at the site root
=============================================

Anything in this folder is served as-is from "/". So a file saved here as

    rao-shekha-ji.jpg

is reachable in the browser at

    /rao-shekha-ji.jpg


THE FOUNDER PORTRAIT
--------------------
The About page looks for /rao-shekha-ji.jpg. Save the painting there and it
appears on the right-hand side of the page automatically — no code change.

If the file is not there, the page quietly falls back to the drawn SVG
portrait instead, so nothing ever breaks or shows a missing-image icon.

The path is editable: Admin → Club settings → "The name we carry" →
"Portrait image".

Use a portrait-shaped image (taller than wide, around 3:4). Roughly 800px on
the long edge is plenty — anything larger just costs the village bandwidth.


MEMBER PHOTOS
-------------
Member cards on the public members board fall back to a drawn medallion with
the member's initials. To use real photographs later, save them here and set
each member's photoUrl.
