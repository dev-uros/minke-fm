/**
 * Every typeface the app and its skins are drawn in, packed into the app rather than
 * fetched from Google Fonts: nothing leaves the device for them, they are there offline
 * from the first launch, and the first screen does not wait on the network.
 *
 * Each import is one weight with all of its scripts (Latin, Latin Extended, Cyrillic...),
 * each behind a unicode-range, so the webview opens only the files a station's name needs.
 * Only the weights and styles the CSS asks for are here; add one when a rule needs it.
 */

// The cassette skin, the desktop and the shared modals. 750 is drawn with 800.
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';

// Transistor.
import '@fontsource/zilla-slab/500.css';
import '@fontsource/zilla-slab/500-italic.css';
import '@fontsource/zilla-slab/700.css';

// Turntable.
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/700-italic.css';

// Hi-fi.
import '@fontsource/vt323/400.css';
import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';

// Pocket LCD.
import '@fontsource/silkscreen/400.css';
import '@fontsource/press-start-2p/400.css';

// The handwritten label on the cassette.
import '@fontsource/indie-flower/400.css';
