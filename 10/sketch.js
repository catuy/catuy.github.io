let x, y, j, k;
let px, py, pj, pk;
let osc, fft;

var c = ["#C460E0", 
        //  "#F469A9", 
         "#69F5E7", 
        //  "#687DF2", 
        //  "#69F591",             
         "#F1Ea67"];


function setup() {
  // createCanvas(windowHeight*.7, windowHeight);
  createCanvas(windowWidth, windowHeight);

  x = random(255);
  y = random(255);
  j = random(255);
  k = random(255);
  px = x;
  py = y;

  // background(222);
  osc = new p5.TriOsc(); // definir frecuencia y tipo
  osc.amp(0.5);

  fft = new p5.FFT();
  osc.start();
}

function draw() {

  x += (noise(frameCount * 0.01) - 0.5) * 90;
  y += (noise(frameCount * 0.02) - 0.5) * 90;
  j += (noise(frameCount * 0.03) - 0.5) * 90;
  k += (noise(frameCount * 0.04) - 0.5) * 90;

  if (x > width - 100) {
    px = x = 100;
  }
  if (x < 100) {
    px = x = width - 100;
  }
  if (y > height - 100) {
    py = y =  100;
  }
  if (y < 100) {
    py = y = height - 100;
  }

  // stroke(255);
  // line(x, y, px, py);
  // strokeWeight(200);
  // stroke(0);
  ellipse(x, y, 150, 150);
  // rect(j, k, 100, 100);
  // line(x, y, px, py);

  // stroke(random(255), random(255), random(255));
  stroke(random(c));
  fill(0);

  strokeWeight(2);
    // line(pmouseX, pmouseY, mouseX, mouseY);
   
    // cambia la frecuencia del oscilador según mouseX
   let freq = map(x, 0, width, 40, 880);
   osc.freq(freq);
 
   // cambia la amplitud del oscilador según mouseY
   let amp = map(y, 0, height, 1, 0.01);
   osc.amp(amp);

  px = x;
  py = y;
}

 save_canvas = function() {
    save();
  }

  function mousePressed() {
    noLoop();
  }
  