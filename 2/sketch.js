var dim;

function setup() {
  createCanvas(displayWidth, displayHeight);
  let fill_color = color('#312783');
  let stroke_color = color('#E6007E');
  let background_color = color('#eee');
  let stroke_wight = 0;
  dim = width/2;
  colorMode(HSB, 360, 100, 100);
  ellipseMode(RADIUS);


  background(background_color);
  fill(fill_color);
  stroke(stroke_color);
  strokeWeight(stroke_wight);

}

function draw() {
  // background(0);
  for (var x = 0; x <= width; x+=dim) {
    drawGradient(x, height/2);
  } 
}

// function drawGradient(x, y) {
//   var radius = dim/4;
//   var h = random(0, 360);
//   for (r = radius; r > 0; --r) {
//     fill(h, 90, 90);
//     ellipse(x, y, r, r);
//     h = (h + 1) % 360;
//   }
// }

function touchMoved() {
  
  let object_width = 50;
  let object_height = 50;
  var h = random(0, 360);

  ellipse(mouseX, mouseY, object_width, object_height);
  fill(h, 90, 90);
  // h = (h + 1) % 360;
  // var h = random(0, 360);
  return false;
}


