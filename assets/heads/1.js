<script>
var head_color;
var fill_color;
var background_color;
var border_color;


var sketch10 = function(p) {
  const root = document.documentElement;
  root.style.setProperty('--first-color', '#ff0000');
  root.style.setProperty('--second-color', '#ffffff');
  colores = ['#ff0000', '#ffffff']; 
  head_color = 0Xff0000;
background_color = '#ff0000';
  p.setup = function() {
    p.a = p.random(colores);
    p.b = p.random(20,250);
    p.c = p.random(20,250);
    p.createCanvas(p.displayWidth, p.displayHeight);
    p.background(background_color);
    p.fill(p.a);
    p.noStroke();
    p.rectMode(p.CENTER);
    p.noLoop();
  };
  
  p.mouseMoved = function() {
      p.rect(p.mouseX, p.mouseY, p.b, p.displayHeight/2);
      p.a = p.random(colores);
    p.b = p.random(20,120);
    p.c = p.random(20,250);
    p.fill(p.a);
    p.rect(p.mouseX, p.mouseY, p.b, p.displayHeight/2);
    
  };
  p.windowResized = function() {
    p.resizeCanvas(p.displayWidth, p.displayHeight);
    p.background(background_color);
  }
};

var myp5_1 = new p5(sketch10);
</script>
