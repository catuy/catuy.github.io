let osc, fft;

function setup() {
  createCanvas(windowWidth, windowHeight);
  osc = new p5.TriOsc(); // definir frecuencia y tipo
  osc.amp(0.5);

  fft = new p5.FFT();
  osc.start();
}

function draw() {
  stroke(random(255), random(255), random(255));
  strokeWeight(25);
  line(pmouseX, pmouseY, mouseX, mouseY);
   // cambia la frecuencia del oscilador según mouseX
   let freq = map(mouseX, 0, width, 40, 880);
   osc.freq(freq);
 
   // cambia la amplitud del oscilador según mouseY
   let amp = map(mouseY, 0, height, 1, 0.01);
   osc.amp(amp);
}

function mousePressed() {
  fill(random(255), random(255), random(255));
  ellipse(mouseX, mouseY, 50, 50);
}