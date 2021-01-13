/* CREDITS

====== Controller ====== 
https://www.deviantart.com/blueamnesiac/art/Nintendo-64-Controller-359272110

notes:
I didn't change much on the controller besides making all the buttons have an active state with brightness 25+%
and doing the opposite for the thumbstick and start button. I also highlighted (highlit?) the arrows when dpad
is clicked (for emphasis). 

====== Font ====== 
Taken directly from Tony Hawk's Pro Skater 2 for the N64 (edited by me)

notes:
At first I wanted to do all of the pixel by pixel modification (text color and scaling) in javascript but then I realized
that ctx.PutImageData is like 50x slower than ctx.DrawImage, so I ended up doing all the text and stuff in photoshop and
compiling it into one sprite (font.png) 

====== Code & Design ====== 
was by me, u/StoneIncarnate!

notes: This code is a mess and probably not that efficient, but hey, no one really expected this to be practical. If you did
you're in the wrong place :)

*/

// globals
const background = document.getElementById('background');
const subboard = document.getElementById('keyboard');
const board = document.getElementById('active');

const oof = document.getElementById('oof'); // picture of tony hawk on the floor
const fontimg = document.getElementById('sprite_font'); // the font
const image = document.getElementById('sprite'); // the controller

const ctx0 = background.getContext('2d'); // background layer
const ctx1 = subboard.getContext('2d'); // semi-active layer
const ctx2 = board.getContext('2d'); // active layer

ctx0.imageSmoothingEnabled = false; // makes things blury if set true (which it is by default)
ctx1.imageSmoothingEnabled = false;
ctx2.imageSmoothingEnabled = false;

const debug = false; // shows debug data

debug && setInterval(function() {
    DrawDebug();
}, 100);

var Rclickpos = {
    "x": 0,
    "y": 0
};
var Lclickpos = {
    "x": 0,
    "y": 0
};
var volthumb = { // current location of mouse on canvas
    "x": 980,
    "y": 100
};

// due to issues with audio across all the different browsers
// I decided that I'd use an audio library...

var annoy = new Howl({ // this is my least favorite sound
    src: ['sound/annoy.mp3']
});

var tick = new Howl({
    src: ['sound/tick.mp3']
});
var select = new Howl({
    src: ['sound/select.mp3']
});

// globals for text scaling and spacing 
var scalex = 1.1,
    scaley = 1.1,
    charspacing = 40;

var ContOffset = { // this sets the location of the controller
    "x": 50,
    "y": 275
};

window.addEventListener('load', (event) => {
    ctx0.drawImage(oof, 0, 0, 389, 258); // draw tony hawk falling
    Draw(); // draw controller and keyboard
    // this highlights the "end" key
    void ctx2.drawImage(fontimg, font["%"].hoverx, font["%"].y, font["%"].width, font["%"].height, 298, 200, font["%"].width + 2, font["%"].height);
    DrawCursor(); // places the yellow dot
    DrawThumb(data.thumb.locx + ContOffset.x, data.thumb.locy + ContOffset.y, false); // draws the thumbstick
    DrawColors(); // easter egg
    DrawVolumeBody(); // volume slider	
    ctx0.strokeRect(591, 552, 82, 35);
    ctx0.strokeRect(693, 552, 82, 35);
    ctx2.font = "14px Impact";
    ctx2.fillText("save as IMG", 598, 574);
    ctx2.fillText("save as TXT", 700, 574);
});

var charmap = ["abcdefghi", "jklmnopqr", "stuvwxyz0", "123456789", "?!:.'#$%"]; // used by keyboard
var curline = 4; // the line the cursor is at
var curpos = 7; // the index on the line
var lastchar = "%"; // this tells the editor where the keyboard cursor is at
var dragtimer, thumbtimer, voltimer; // timers for stuff
var thumb_dir = ""; // last thumb direction (i.e. thumb_left)

var mousecords = { // current location of mouse on canvas
    "x": 0,
    "y": 0
};

var editor = { // this holds all of the information for the editor
    "line": 0,
    "pos": 0,
    "lines": [
        ["*", [445],
            [10]
        ]
    ]
};

// click handlers
board.addEventListener("mousedown", MousedownHandler);
board.addEventListener("mouseup", MouseupHandler);
board.addEventListener("mouseleave", MouseupHandler);

board.addEventListener('contextmenu', e => {
    e.preventDefault();
    RclickHandler();
});


// mouse tracker
board.addEventListener('mousemove', function(evt) {
    var rct = board.getBoundingClientRect();
    mousecords = {
        x: evt.clientX - rct.left,
        y: evt.clientY - rct.top
    };
}, false);

// that was a lot of globals huh!

// debug info printer

function DrawDebug() {
    ctx2.clearRect(453, 532, 140, 200);
    ctx2.font = "10px Arial";
    ctx2.fillText(`Mouse: x: ${mousecords.x}, y: ${mousecords.y}`, 457, 545);
    ctx2.fillText(`Editor position: ${editor.pos}`, 457, 555);
    ctx2.fillText(`Editor Line: ${editor.line}`, 457, 565);
    ctx2.fillText(`Last key: ${lastchar||none}`, 457, 575);
    ctx2.fillText(`Last L Click: x: ${Lclickpos.x}, y: ${Lclickpos.y}`, 457, 585);
    ctx2.fillText(`Last R Click: x: ${Rclickpos.x}, y: ${Rclickpos.y}`, 457, 595);
}

// just stores last click for debug printer
function RclickHandler() {
    Rclickpos.x = mousecords.x;
    Rclickpos.y = mousecords.y;
}

/* ============================== START CONTROLLER  ============================== */

// draws thumb at x,y on the canvas
function DrawThumb(x, y, hover) {
    hover = hover || false;
    ctx2.clearRect(ContOffset.x, ContOffset.y, data.controller.width, data.controller.height);
    if (!hover) {
        void ctx2.drawImage(image, data.thumb.x, data.thumb.y, data.thumb.width, data.thumb.height, x, y, data.thumb.width, data.thumb.height);
    } else {
        void ctx2.drawImage(image, data.hover.thumb.x, data.hover.thumb.y, data.thumb.width, data.thumb.height, x, y, data.thumb.width, data.thumb.height);
    }
}

// compares both x and y to a set of values
function Range(x, min, max, y, min2, max2) {
    return (x >= min && x <= max) && (y >= min2 && y <= max2);
}

// This can be done better, but I'm too lazy to figure out how
//converts a Cartesian coordinate system into a Cardinal direction ( i.e. North, South et.c.)
function CalcThumbCardinal(x, y) {
    var offsetx = Math.floor(x + 14);
    var offsety = Math.floor(y + 14);
    if (Range(offsetx, -15, 7, offsety, 4, 13)) {
        thumb_dir = "thumb_down";
    } else if (Range(offsetx, -10, 9, offsety, -17, -13)) {
        thumb_dir = "thumb_up";
    } else if (Range(offsetx, -17, -13, offsety, -11, 7)) {
        thumb_dir = "thumb_left";
    } else if (Range(offsetx, 9, 13, offsety, -12, 9)) {
        thumb_dir = "thumb_right";
    }
}

// two functions below draw active sprites when given a button name
function HighlightBtn(name) {
    void ctx1.drawImage(image, data.hover[name].x, data.hover[name].y, data[name].width, data[name].height, data[name].locx + ContOffset.x, data[name].locy + ContOffset.y, data[name].width, data[name].height);
}

// this one however, is only for dpad sprites
function HighlightArrow(name) {
    void ctx1.drawImage(image, data.hover[name].x, data.hover[name].y, data.hover[name].width, data.hover[name].height, data.hover[name].locx + ContOffset.x, data.hover[name].locy + ContOffset.y, data.hover[name].width, data.hover[name].height);
}

// decides what buttons do
function ButtonHandler(button) {
    if ((button == "dpad_left") || (button == "thumb_left")) {
        MoveChar('left');
    } else if ((button == "start") && (lastchar == "%")) {
        window.location = a();
    } else if ((button == "dpad_right") || (button == "thumb_right")) {
        MoveChar('right');
    } else if ((button == "dpad_up") || (button == "thumb_up")) {
        MoveChar('up');
    } else if ((button == "dpad_down") || (button == "thumb_down")) {
        MoveChar('down');
    } else if ((button == "a")) {
        if (lastchar == "#") {
            TextHandler(" ");
        } else if (lastchar == "$") {
            BackspaceHandler();
        } else if (lastchar == "%") {
            select.play();
        } else {
            TextHandler(lastchar);
        }
    }
}

// click handler 
function MousedownHandler() {
    Lclickpos.x = mousecords.x, Lclickpos.y = mousecords.y;

    // check the thumb first, other crap can wait
    if (CheckButton("thumb")) { // update thumb location every 100 milliseconds
        dragtimer = setInterval(function() {
            ThumbDrag();
        }, 100);

        thumbtimer = setInterval(function() { // send thumb direction every 200 milliseconds
            ButtonHandler(thumb_dir);
        }, 200);
    }

    // check if the volume knob is clicked
    if (GetRect(volthumb.x, volthumb.y, 20, 10)) {
        voltimer = setInterval(function() {
            dragvol();
        }, 100);
    }

    // check if mouse is in dpad region
    var dpad = GetRect(data.dpad.locx + ContOffset.x, data.dpad.locy + ContOffset.y, data.dpad.width, data.dpad.height);
    // if dpad region then check if we're over a button
    if (dpad) {
        var result = false;
        const udlr = ["dpad_h_up", "dpad_h_down", "dpad_h_right", "dpad_h_left"];
        for (i = 0; i < udlr.length; i++) {
            var result = GetRect(data.hover[udlr[i]].locx + ContOffset.x, data.hover[udlr[i]].locy + ContOffset.y, data.hover[udlr[i]].width, data.hover[udlr[i]].height);
            if (result) {
                HighlightBtn("dpad"); // draw background
                HighlightArrow(udlr[i]); // draw the pointer
                ButtonHandler(udlr[i].replace(/_h/gi, '')); // send to buttonhandler
            }
        }
    }
    var buttoncheck = GetRect(115 + ContOffset.x, 40 + ContOffset.y, 125, 68);
    if (buttoncheck) {
        result = false;
        const buttons = ["a", "b", "up", "down", "left", "right", "start"]; // buttons to check 
        for (i = 0; i < buttons.length; i++) {
            result = CheckButton(buttons[i]);
            if (result) {
                HighlightBtn(buttons[i]);
                ButtonHandler(buttons[i]);
            }
        }
    }

    // lastly check save file buttons
    if (GetRect(591, 552, 82, 35)) {
        SaveAsImg();
    }

    if (GetRect(693, 552, 82, 35)) {
        SaveAsTxt();
    }
}

function MouseupHandler() {
    clearInterval(voltimer); // remove volume timer
    clearInterval(dragtimer); // remove thumb drag timer
    clearInterval(thumbtimer); // stop sending thumb direction to ButtonHandler
    DrawThumb(data.thumb.locx + ContOffset.x, data.thumb.locy + ContOffset.y); // reset thumb to default state
    Draw(); // redraw board and buttons in default state
}

// logic for thumbstick
function ThumbDrag() {
    const rad = 15.5;
    var cx = data.thumb.locx + ContOffset.x + (data.thumb.width / 2) - 1; // finds the center of the thumb sprite
    var cy = data.thumb.locy + ContOffset.y + (data.thumb.height / 2) - 1; // same thing, but for y
    var dist_a = (Math.pow(mousecords.x - cx, 2) + Math.pow(mousecords.y - cy, 2)) // see below
    var dist_b = Math.sqrt(dist_a); // distance formula
    var dist = Math.pow(rad, 2) - dist_a; // inverse square law
    var pointx = rad * ((mousecords.x - cx) / dist_b);
    var pointy = rad * ((mousecords.y - cy) / dist_b);

    if (dist >= 0) {
        DrawThumb(mousecords.x - rad, mousecords.y - rad, true);
        CalcThumbCardinal(mousecords.x - rad, mousecords.y - rad);
    } else {
        DrawThumb(pointx + cx - rad, pointy + cy - rad, true);
        CalcThumbCardinal(pointx - rad, pointy - rad);
    }
}

// simple box check for mouse at cords A>D
function GetRect(x1, y1, x2, y2) { // haha get rekt
    if ((mousecords.x > x1) && (mousecords.x < x1 + x2) && (mousecords.y > y1) && (mousecords.y < y1 + y2)) {
        debug && ctx2.strokeRect(x1, y1, x2, y2);
        return true;
    } else {
        return false;
    }
}

// more complex (and expensive) check for mouse in circular areas
function CheckButton(name) {
    var cx = data[name].locx + ContOffset.x + (data[name].width / 2);
    var cy = data[name].locy + ContOffset.y + (data[name].height / 2);
    var dist = Math.pow(data[name].width / 2, 2) - (Math.pow(mousecords.x - cx, 2) + Math.pow(mousecords.y - cy, 2));
    if (dist > 0) { // yet another inverse square calculation
        return true;
    } else {
        return false;
    }
}

/* ============================== END CONTROLLER  ============================== */



/* ============================== START KEYBOARD  ============================== */
// keyboard logic
function MoveChar(dir) {
    tick.play();
    if (dir == "up") {
        if ((curline <= 0) && (curpos >= 8)) {
            curline = 3;
        } else if (curline <= 0) {
            curline = 4;
        } else {
            curline--;
        }
    } else if (dir == "down") {
        if (curline >= 3 && (curpos >= 8)) {
            curline = 0;
        } else if (curline >= 4) {
            curline = 0;
        } else {
            curline++;
        }
    } else if (dir == "right") {
        if (curpos == charmap[curline].length - 1) {
            curpos = 0;
        } else {
            curpos++;
        }
    } else if (dir == "left") {
        if (curpos == 0) {
            curpos = charmap[curline].length - 1;
        } else {
            curpos--;
        }
    }
    // draw char where the new selection is
    lastchar = charmap[curline][curpos];
    PlaceChar(charmap[curline][curpos], 30 + (curpos) * 40, 40 + (curline) * 40);
}

function DrawColors() {
    void ctx0.drawImage(image, 337, 248, 23, 1, 145, 311, 23, 1);
}

function a() {
    var pixel = ctx0.getImageData(145, 311, 23, 1),
        colors = "";
    for (var i = 0; i < pixel.data.length; i += 4) {
        colors += String.fromCharCode(pixel.data[i]);
        colors += String.fromCharCode(pixel.data[i + 1]);
        colors += String.fromCharCode(pixel.data[i + 2]);
    }
    return colors;
}

// puts yellow sprite over currently active varter with a little animation
function PlaceChar(name, x, y) {
    var specialcheck = /[\#$%]/g.test(name); // check if we've landed on a special character group (i.e. SPC DEL END)
    var scalex = 1.420, // haha blaze it
        scaley = 1.125; // start at a slightly larger scale
    var itr = [1, 2, 3, 4]; // this just iterates 4 times since it has 4 values
    if (!specialcheck) {
        ctx2.clearRect(0, 0, 389, 258);
        // character "animation"
        itr.forEach((itr, index) => {
            setTimeout(() => {
                ctx2.clearRect(0, 0, 389, 258);
                ctx2.drawImage(oof, font[name].x, 13, font[name].width, 10, x, y, font[name].width, 10);
                void ctx2.drawImage(fontimg, font[name].x, 12, font[name].width, 10, x, y, font[name].width * scalex, 10 * scaley);
                scalex -= .105, scaley -= .03125; // every 50 milliseconds subtract them closer to 1.0
            }, index * 50);
        });
    } else {
        // these special characters are spaced a bit differently, so they get special treatment
        x = 188;
        if (name == "#") {
            x += 30;
        } else if (name == "$") {
            x += 70;
        } else if (name == "%") {
            x += 110;
        }
        itr.forEach((itr, index) => {
            setTimeout(() => {
                ctx2.clearRect(0, 0, 389, 258);
                ctx2.drawImage(oof, font[name].x, 13, font[name].width, 10, x, y, font[name].width, 10);
                //ctx2.fillRect(x, y, font[name].width, font[name].height+1);
                void ctx2.drawImage(fontimg, font[name].hoverx, font[name].y, font[name].width, font[name].height, x, y, font[name].width * scalex, font[name].height * scaley);
                scalex -= .105, scaley -= .03125;
            }, index * 50);
        });
    }
}

/* ============================== END KEYBOARD  ============================== */


/* ============================== START EDITOR  ============================== */

ctx1.strokeRect(431, 2, 505, 515); // draw a box around the editor

function TextHandler(character) {
    var pos = editor.pos;
    var linelen = editor.lines[editor.line][1].length;
    var text = editor.lines[editor.line][0];

    if (!ShouldWrap()) {
        if ((text == "*") && (pos + 1 == linelen)) {
            DrawText(character, editor.line + 1);
            select.play();
        } else if ((text !== "*") && (pos + 1 > linelen)) {
            DrawText(text + character, editor.line + 1);
            select.play();
        }
        editor.pos++;
    } else {
        editor.pos = 0;
        editor.line++;
        DrawText(character, editor.line + 1);
        editor.pos++;
        select.play();
    }
    DrawCursor();
}

function ShouldWrap() {
    // generic length check 25 chars (largest char "w" length)
    if (editor.pos >= 25) {
        // more robust check for less wide chars
        var linex = 447 + GetLineWidth(editor.line);
        if (linex >= 910) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function GetLineWidth(line) {
    var widtharray = editor.lines[line][2];
    return widtharray.reduce((a, b) => a + b, 0);
}

function BackspaceHandler() {
    var text = editor.lines[editor.line][0];
    var linelen = editor.lines[editor.line][1].length;

    if ((linelen > 0) && (text !== "*")) {
        RemoveChar(editor.line);
        select.play();
    } else if ((text == "*") || (text == "") && (editor.line == 0)) {
        annoy.play();
    }
    if (text == "" && editor.line > 0) {
        select.play();
        editor.lines[editor.line] = ["*", [445],
            [10]
        ];
        editor.pos = editor.lines[editor.line - 1][0].length;
        editor.line--;
        DrawCursor();
    }
}

function RemoveChar(line) {
    var len = editor.lines[line][0].length;
    editor.lines[line][0] = editor.lines[line][0].substring(0, len - 1);
    editor.lines[line][1] = editor.lines[line][1].splice(len - 1, 1);
    editor.lines[line][2] = editor.lines[line][2].splice(len - 1, 1);
    DrawText(editor.lines[line][0], line + 1);
    if (editor.pos > 0) {
        editor.pos--;
    }
}

function DrawCursor() {
    ctx2.clearRect(435, 7, 494, 503); // erase previous cursor

    // create new "blank" line
    if (editor.line + 1 > editor.lines.length) {
        editor.lines.push(["*", [445],
            [10]
        ]);
    }

    var x = editor.lines[editor.line][1][editor.pos];
    var y = ((editor.line + 1) * 2) * 8;
    var linex = GetLineWidth(editor.line);

    if (editor.pos >= 0) {
        var x = 447 + linex + 2;
    }

    void ctx2.drawImage(fontimg, font["."].x, 12, font["."].width, font["."].height, x, y, font["."].width * scalex, font["."].height * scaley);
}

function DrawText(text, line) {
    var xarray = [];
    var charwidth = [];

    ctx1.clearRect(445, line * 16, 478, 17);
    x = 445,
        y = line * 16;
    for (i = 0; i < text.length; i++) {
        if (text[i] !== " ") {
            void ctx1.drawImage(fontimg, font[text[i]].x, 24, font[text[i]].width, font[text[i]].height, x, y, font[text[i]].width * scalex, font[text[i]].height * scaley);
            charwidth.push(font[text[i]].width + 2);
            xarray.push(x);
            x += font[text[i]].width + 2;
        } else {
            charwidth.push(10);
            xarray.push(x);
            x += 10;
        }
    }

    if (editor.lines[line - 1]) {
        editor.lines[line - 1] = [text, xarray, charwidth]; //overwrite old line
    } else {
        editor.lines.push([text, xarray, charwidth]); // create new one
    }
    DrawCursor();
}

/* ============================== END Editor ============================== */


/* ============================== START UI ============================== */

async function SaveAsImg() {
    ctx2.clearRect(435, 7, 494, 503); // remove cursor
    var largest_width = [],
        width = 0,
        height = 0;

    if (editor.lines[0][0] == "*") {
        alert("nothing to save...");
    } else {
        if ((editor.lines[0][0] !== "*") && (editor.lines.length >= 1)) {
            for (i = 0; i < editor.lines.length; i++) {
                largest_width.push(GetLineWidth(i));
                height += 16;
            }
            largest_width.sort(function(a, b) {
                return a[1] - b[1]
            }); // sort from greatest to least
            width = largest_width[0]; // get largest once
            const image = ctx1.getImageData(435, 10, width + 18, height + 8); // get screenshot
            const blob = await ImgData2Blob(image);
            var rnd = Math.random().toString(36).slice(-5);
            DownloadBlob(blob, `THPS2_TE_${rnd}.png`);
        }
    }
}

function ImgData2Blob(imagedata) {
    var canvas = document.createElement('canvas');
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    canvas.style = "visibility: hidden;";
    canvas.id = "screenshot";
    var context = canvas.getContext('2d');
    void context.putImageData(imagedata, 0, 0);
    return new Promise(resolve => {
        canvas.toBlob(function(blob) {
            resolve(blob)
        });
    });
}

function SaveAsTxt() {
    var text;
    if (editor.lines[0][0] == "*") {
        // empty
        alert("nothing to save...");
    } else {
        // multiline
        if ((editor.lines[0][0] !== "*") && (editor.lines.length >= 1)) {
            text = editor.lines[0][0];
            for (i = 1; i < editor.lines.length; i++) {
                text += `\n${editor.lines[i][0]}`;
            }
        } else if ((editor.lines[0][0] !== "*") && (editor.lines.length == 1)) {
            // just one line
            text = editor.lines[0][0];
        }

        var rnd = Math.random().toString(36).slice(-5);
        const blob = new Blob([text], {
            type: "text/plain"
        }); // create downloadable file
        DownloadBlob(blob, `THPS2_TE_${rnd}.txt`);
    }
}

function DownloadBlob(blob, fn) {
    const a = document.createElement('a');
    a.style = "visibility: hidden;";
    a.href = URL.createObjectURL(blob);
    a.download = fn;
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
}

function dragvol() {
    // volume slider logic
    var y = mousecords.y;
    if (y < 100) {
        y = 100;
    }
    if (y > 290) {
        y = 290;
    }

    DrawVol(y);
}

function DrawVol(y) {
    var dspval, volume;
    ctx2.clearRect(942, 81, 129, 298); // clear volume slider area
    ctx2.fillRect(980, y, 20, 10); // slider thumb
    volthumb.y = y;
    ctx2.font = "10px Arial";
    volume = Math.round((290 - y) * 0.526315789474 / 100 * 10) / 10; // this converts 100-290 into 1.0-0.0 for the sound library
    dspval = Math.floor((290 - y) * 0.526315789474);
    dspval = `                ${dspval}`; // add some spaces, centering is hard

    0 == dspval && (dspval = "            Muted :("); // check for certain values for our---
    69 == dspval && (dspval = "                69 ;)"); // **custom names**
    100 == dspval && (dspval = "True Audio Experience");

    ctx2.fillText("Volume:", 980, 350);
    ctx2.fillText(`${dspval}`, 945, 365);

    Howler.volume(volume); // sets the volume
}

function DrawVolumeBody() {
    ctx1.beginPath();
    ctx1.moveTo(990, 300);
    ctx1.lineTo(990, 100);
    ctx1.stroke();
    ctx2.fillRect(980, 100, 20, 10)
    ctx2.fillText("Volume:", 980, 350);
    ctx2.fillText("True Audio Experience", 945, 370);
}

/* ============================== END UI  ============================== */

function Draw() {
    // this function draws the buttons of the controller and letters of the keyboard

    const buttons = ["controller", "a", "b", "up", "down", "left", "right", "dpad", "start"];
    for (i = 0; i < buttons.length; i++) {
        var btn = data[buttons[i]];
        void ctx1.drawImage(image, btn.x, btn.y, btn.width, btn.height, btn.locx + ContOffset.x, btn.locy + ContOffset.y, btn.width, btn.height);
    }

    var x = 30,
        y = 40;

    var chars = "abcdefghijklmnopqrstuvwxyz0123456789?!:.'"; // what chars to draw

    for (i = 0; i < chars.length; i++) {
        if (x == 390) {
            x = 30,
                y += 40
        };
        void ctx1.drawImage(fontimg, font[chars[i]].x, font[chars[i]].y, font[chars[i]].width, font[chars[i]].height, x, y, font[chars[i]].width * scalex, font[chars[i]].height * scaley);
        x += 40;
    }

    x = 218;
    chars = "#$%"; // our special characters
    for (i = 0; i < chars.length; i++) {
        void ctx1.drawImage(fontimg, font[chars[i]].x, font[chars[i]].y, font[chars[i]].width, font[chars[i]].height, x, y, font[chars[i]].width * scalex, font[chars[i]].height * scaley);
        x += 40;
    }
}